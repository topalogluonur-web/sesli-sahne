const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');
const { publicUploadUrl } = require('../utils');
const { getVoiceProfile, stripProductionNotes } = require('./studioService');

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const EDGE_TTS_WS = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;

const TURKISH_EDGE_VOICES = {
  female_soft: 'tr-TR-EmelNeural',
  female_calm: 'tr-TR-EmelNeural',
  male_deep: 'tr-TR-AhmetNeural',
  male_natural: 'tr-TR-AhmetNeural',
  neutral_story: 'tr-TR-EmelNeural',
  character_story: 'tr-TR-AhmetNeural'
};

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function dateHeader() {
  return new Date().toISOString();
}

function headerBlock(headers) {
  return Object.entries(headers).map(([key, value]) => `${key}:${value}`).join('\r\n') + '\r\n\r\n';
}

function rateFromStyle(style) {
  if (style === 'bedtime') return '-12%';
  if (style === 'educational') return '-6%';
  if (style === 'theatrical') return '+0%';
  return '-2%';
}

function chunkText(text, maxChars = 3200) {
  const clean = String(text || '').replace(/\r/g, '').trim();
  if (clean.length <= maxChars) return [clean];

  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if ((current + '\n\n' + paragraph).trim().length <= maxChars) {
      current = (current ? current + '\n\n' : '') + paragraph;
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
      if ((current + ' ' + sentence).trim().length <= maxChars) {
        current = (current ? current + ' ' : '') + sentence.trim();
      } else {
        if (current) chunks.push(current);
        current = sentence.trim();
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

function parseBinaryAudioPayload(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const marker = Buffer.from('\r\n\r\n');
  const idx = buffer.indexOf(marker);
  if (idx === -1) return null;
  const header = buffer.slice(0, idx).toString('utf8');
  if (!/Path:audio/i.test(header)) return null;
  return buffer.slice(idx + marker.length);
}

function synthesizeChunk({ text, voiceName, style }) {
  const connectionId = crypto.randomBytes(16).toString('hex');
  const url = `${EDGE_TTS_WS}&ConnectionId=${connectionId}`;
  const rate = rateFromStyle(style);
  const ssml = `<speak version="1.0" xml:lang="tr-TR" xmlns="http://www.w3.org/2001/10/synthesis"><voice name="${escapeXml(voiceName)}"><prosody rate="${rate}">${escapeXml(text)}</prosody></voice></speak>`;

  return new Promise((resolve, reject) => {
    const chunks = [];
    const ws = new WebSocket(url, {
      headers: {
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const timeout = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error('Edge online TTS zaman aşımına uğradı. İnternet bağlantısını kontrol et.'));
    }, 60000);

    ws.on('open', () => {
      const config = {
        context: {
          synthesis: {
            audio: {
              metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
              outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
            }
          }
        }
      };

      ws.send(headerBlock({
        'X-Timestamp': dateHeader(),
        'Content-Type': 'application/json; charset=utf-8',
        'Path': 'speech.config'
      }) + JSON.stringify(config));

      ws.send(headerBlock({
        'X-RequestId': connectionId,
        'Content-Type': 'application/ssml+xml',
        'X-Timestamp': dateHeader(),
        'Path': 'ssml'
      }) + ssml);
    });

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        const audio = parseBinaryAudioPayload(data);
        if (audio && audio.length) chunks.push(audio);
        return;
      }

      const message = data.toString('utf8');
      if (/Path:turn\.end/i.test(message)) {
        clearTimeout(timeout);
        try { ws.close(); } catch {}
        const audio = Buffer.concat(chunks);
        if (!audio.length) return reject(new Error('Edge online TTS ses verisi döndürmedi.'));
        resolve(audio);
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

async function createEdgeSpeechMp3({ input, episodeId, voiceProfile, voice, style, edgeVoiceName }) {
  const cleanText = stripProductionNotes(input);
  if (!cleanText) throw new Error('Seslendirilecek temiz metin boş.');

  const selectedProfile = getVoiceProfile(voiceProfile || voice || 'female_soft');
  const voiceName = edgeVoiceName || process.env.EDGE_TTS_VOICE_NAME || TURKISH_EDGE_VOICES[selectedProfile.id] || 'tr-TR-EmelNeural';
  const textChunks = chunkText(cleanText);

  const uploadRoot = process.env.UPLOAD_ROOT || './uploads';
  const audioDir = path.resolve(process.cwd(), uploadRoot, 'audio');
  await fs.mkdir(audioDir, { recursive: true });

  const filename = `episode-${episodeId || 'test'}-${crypto.randomUUID()}.mp3`;
  const absolutePath = path.join(audioDir, filename);

  console.log(`[EDGE TTS] Başladı | episode=${episodeId || 'test'} | voice=${voiceName} | chunks=${textChunks.length} | chars=${cleanText.length}`);

  const audioChunks = [];
  for (let i = 0; i < textChunks.length; i += 1) {
    console.log(`[EDGE TTS] Parça ${i + 1}/${textChunks.length} gönderiliyor | chars=${textChunks[i].length}`);
    // eslint-disable-next-line no-await-in-loop
    const audio = await synthesizeChunk({ text: textChunks[i], voiceName, style });
    audioChunks.push(audio);
  }

  const finalAudio = Buffer.concat(audioChunks);
  await fs.writeFile(absolutePath, finalAudio);
  const stat = await fs.stat(absolutePath);
  if (!stat.size || stat.size < 1000) throw new Error('MP3 dosyası yazıldı ama boyutu geçersiz görünüyor.');

  console.log(`[EDGE TTS] Tamamlandı | file=${absolutePath} | bytes=${stat.size} | voice=${voiceName}`);

  return {
    filename,
    absolutePath,
    bytes: stat.size,
    audioUrl: publicUploadUrl('audio', filename),
    model: 'edge-online-readaloud',
    voice: voiceName,
    voiceProfile: selectedProfile.id,
    voiceLabel: selectedProfile.label,
    provider: 'edge_online',
    format: 'mp3',
    chunkCount: textChunks.length,
    selectedCulture: 'tr-TR',
    selectedGender: voiceName.includes('Ahmet') ? 'Male' : 'Female',
    selectedBy: edgeVoiceName || process.env.EDGE_TTS_VOICE_NAME ? 'edge_voice_name' : 'voice_profile',
    instructions: 'Keysiz Edge online Türkçe neural ses kullanıldı. API key gerekmez; internet bağlantısı gerekir.'
  };
}

function listEdgeTurkishVoices() {
  return [
    { name: 'tr-TR-EmelNeural', culture: 'tr-TR', gender: 'Female', label: 'Türkçe kadın neural - Emel' },
    { name: 'tr-TR-AhmetNeural', culture: 'tr-TR', gender: 'Male', label: 'Türkçe erkek neural - Ahmet' }
  ];
}

module.exports = { createEdgeSpeechMp3, listEdgeTurkishVoices };
