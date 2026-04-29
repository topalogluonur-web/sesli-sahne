const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { publicUploadUrl } = require('../utils');
const { getVoiceProfile, makeSpeechReadyText } = require('./studioService');

const TURKISH_EDGE_VOICES = {
  female_soft: 'tr-TR-EmelNeural',
  female_calm: 'tr-TR-EmelNeural',
  male_deep: 'tr-TR-AhmetNeural',
  male_natural: 'tr-TR-AhmetNeural',
  neutral_story: 'tr-TR-EmelNeural',
  character_story: 'tr-TR-AhmetNeural'
};

function normalizeRate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const numeric = raw.replace('%', '');
  const parsed = Number.parseInt(numeric, 10);
  if (Number.isNaN(parsed)) return '';
  const clamped = Math.max(-50, Math.min(20, parsed));
  return `${clamped >= 0 ? '+' : ''}${clamped}%`;
}

function rateFromStyle(style) {
  if (style === 'bedtime') return '-22%';
  if (style === 'educational') return '-18%';
  if (style === 'theatrical') return '-12%';
  return '-16%';
}

function addReadingPauses(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/([.!?…])\s+/g, '$1\n')
    .replace(/(;|:)\s+/g, '$1 ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function chunkText(text, maxChars = 2600) {
  const clean = String(text || '').replace(/\r/g, '').trim();
  if (clean.length <= maxChars) return [clean];

  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const next = (current ? current + '\n\n' : '') + paragraph;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) chunks.push(current);

    if (paragraph.length <= maxChars) {
      current = paragraph;
      continue;
    }

    const sentences = paragraph.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [paragraph];
    current = '';
    for (const sentence of sentences) {
      const candidate = (current ? current + ' ' : '') + sentence.trim();
      if (candidate.length <= maxChars) current = candidate;
      else {
        if (current) chunks.push(current);
        current = sentence.trim();
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, ...options });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (data) => { stdout += data.toString(); });
    child.stderr?.on('data', (data) => { stderr += data.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} ${args.join(' ')} başarısız oldu. Kod=${code}. ${stderr || stdout}`));
    });
  });
}

async function findPythonCommand() {
  const candidates = process.platform === 'win32'
    ? [ { cmd: 'py', args: ['-3'] }, { cmd: 'python', args: [] }, { cmd: 'python3', args: [] } ]
    : [ { cmd: 'python3', args: [] }, { cmd: 'python', args: [] } ];

  for (const candidate of candidates) {
    try {
      await run(candidate.cmd, [...candidate.args, '-c', 'import sys; print(sys.version)']);
      return candidate;
    } catch (_) {}
  }
  throw new Error('Python bulunamadı. Keysiz Türkçe neural ses için önce Python kurulu olmalı veya Windows yerel TTS kullanılmalı.');
}

async function ensureEdgeTtsAvailable(python) {
  try {
    await run(python.cmd, [...python.args, '-c', 'import edge_tts; print(edge_tts.__version__ if hasattr(edge_tts, "__version__") else "ok")']);
  } catch (error) {
    throw new Error('edge-tts Python paketi kurulu değil. Ana klasörde INSTALL_EDGE_TTS_PYTHON.bat dosyasını çalıştır, sonra backend’i yeniden başlat. Detay: ' + error.message);
  }
}

async function runPythonEdgeTts({ python, textPath, outputPath, voiceName, rate }) {
  const script = `
import asyncio
import sys
from pathlib import Path
import edge_tts

text_path = Path(sys.argv[1])
output_path = Path(sys.argv[2])
voice = sys.argv[3]
rate = sys.argv[4]
text = text_path.read_text(encoding='utf-8').strip()

async def main():
    communicate = edge_tts.Communicate(text, voice=voice, rate=rate)
    await communicate.save(str(output_path))

asyncio.run(main())
`;
  const scriptPath = path.join(os.tmpdir(), `sesli-sahne-edge-${crypto.randomUUID()}.py`);
  await fs.writeFile(scriptPath, script, 'utf8');
  try {
    return await run(python.cmd, [...python.args, scriptPath, textPath, outputPath, voiceName, rate]);
  } finally {
    await fs.rm(scriptPath, { force: true }).catch(() => {});
  }
}

async function createPythonEdgeSpeechMp3({ input, episodeId, voiceProfile, voice, style, edgeVoiceName, ttsRate, pauseLevel }) {
  const cleanText = addReadingPauses(makeSpeechReadyText(input, { style, pause_level: pauseLevel || process.env.EDGE_TTS_PAUSE_LEVEL || 'normal' }));
  if (!cleanText) throw new Error('Seslendirilecek temiz metin boş. Prodüksiyon notları dışında metin bulunamadı.');

  const selectedProfile = getVoiceProfile(voiceProfile || voice || 'female_soft');
  const voiceName = edgeVoiceName || process.env.EDGE_TTS_VOICE_NAME || TURKISH_EDGE_VOICES[selectedProfile.id] || 'tr-TR-EmelNeural';
  const rate = normalizeRate(ttsRate) || normalizeRate(process.env.EDGE_TTS_RATE) || rateFromStyle(style);
  const chunks = chunkText(cleanText, Number(process.env.EDGE_TTS_MAX_CHARS || 2300));

  const python = await findPythonCommand();
  await ensureEdgeTtsAvailable(python);

  const uploadRoot = process.env.UPLOAD_ROOT || './uploads';
  const audioDir = path.resolve(process.cwd(), uploadRoot, 'audio');
  await fs.mkdir(audioDir, { recursive: true });

  const filename = `episode-${episodeId || 'test'}-${crypto.randomUUID()}.mp3`;
  const absolutePath = path.join(audioDir, filename);
  const partPaths = [];

  console.log(`[PY EDGE TTS] Başladı | episode=${episodeId || 'test'} | voice=${voiceName} | chunks=${chunks.length} | chars=${cleanText.length} | rate=${rate}`);

  try {
    for (let index = 0; index < chunks.length; index += 1) {
      const textPath = path.join(os.tmpdir(), `sesli-sahne-text-${crypto.randomUUID()}.txt`);
      const partPath = path.join(os.tmpdir(), `sesli-sahne-audio-${crypto.randomUUID()}.mp3`);
      partPaths.push(partPath);
      await fs.writeFile(textPath, chunks[index], 'utf8');
      console.log(`[PY EDGE TTS] Parça ${index + 1}/${chunks.length} | chars=${chunks[index].length}`);
      try {
        await runPythonEdgeTts({ python, textPath, outputPath: partPath, voiceName, rate });
      } finally {
        await fs.rm(textPath, { force: true }).catch(() => {});
      }
      const partStat = await fs.stat(partPath).catch(() => null);
      if (!partStat || partStat.size < 1000) throw new Error(`Edge TTS parçası oluşmadı veya bozuk görünüyor. Parça=${index + 1}`);
    }

    const buffers = [];
    for (const partPath of partPaths) buffers.push(await fs.readFile(partPath));
    const finalAudio = Buffer.concat(buffers);
    await fs.writeFile(absolutePath, finalAudio);
    const stat = await fs.stat(absolutePath);
    if (!stat.size || stat.size < 1000) throw new Error('MP3 dosyası yazıldı ama boyutu geçersiz görünüyor.');

    console.log(`[PY EDGE TTS] Tamamlandı | file=${absolutePath} | bytes=${stat.size} | voice=${voiceName}`);

    return {
      filename,
      absolutePath,
      bytes: stat.size,
      audioUrl: publicUploadUrl('audio', filename),
      model: 'python-edge-tts',
      voice: voiceName,
      voiceProfile: selectedProfile.id,
      voiceLabel: selectedProfile.label,
      provider: 'edge_python',
      format: 'mp3',
      chunkCount: chunks.length,
      selectedCulture: 'tr-TR',
      selectedGender: voiceName.includes('Ahmet') ? 'Male' : 'Female',
      selectedBy: edgeVoiceName || process.env.EDGE_TTS_VOICE_NAME ? 'edge_voice_name' : 'voice_profile',
      instructions: 'Keysiz Python edge-tts ile Türkçe neural ses kullanıldı. API key gerekmez; internet bağlantısı gerekir.'
    };
  } finally {
    for (const partPath of partPaths) await fs.rm(partPath, { force: true }).catch(() => {});
  }
}

module.exports = { createPythonEdgeSpeechMp3 };
