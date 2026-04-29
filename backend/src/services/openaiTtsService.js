const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { publicUploadUrl } = require('../utils');
const { getVoiceProfile, stripProductionNotes } = require('./studioService');

function chunkForTts(input, maxChars = 2200) {
  const text = stripProductionNotes(input);
  if (!text) return [];
  if (text.length <= maxChars) return [text];

  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let buffer = '';

  for (const paragraph of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars && buffer) {
      chunks.push(buffer);
      buffer = paragraph;
    } else if (candidate.length > maxChars && !buffer) {
      const sentences = paragraph.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [paragraph];
      let sentenceBuffer = '';
      for (const sentence of sentences) {
        const sentenceCandidate = sentenceBuffer ? `${sentenceBuffer} ${sentence.trim()}` : sentence.trim();
        if (sentenceCandidate.length > maxChars && sentenceBuffer) {
          chunks.push(sentenceBuffer);
          sentenceBuffer = sentence.trim();
        } else {
          sentenceBuffer = sentenceCandidate;
        }
      }
      buffer = sentenceBuffer;
    } else {
      buffer = candidate;
    }
  }

  if (buffer) chunks.push(buffer);

  return chunks.flatMap((chunk) => {
    if (chunk.length <= maxChars) return [chunk];
    const parts = [];
    for (let i = 0; i < chunk.length; i += maxChars) parts.push(chunk.slice(i, i + maxChars));
    return parts;
  });
}

function buildInstructions({ style = 'natural', voiceProfile } = {}) {
  const selected = getVoiceProfile(voiceProfile || 'female_soft');
  const styleInstructions = {
    bedtime: 'Speak in Turkish with a calm, warm, slow bedtime-story tone. Keep the delivery soft and soothing. Avoid sounding robotic.',
    theatrical: 'Speak in Turkish with a natural audio-theatre narrator tone. Add expressive but not exaggerated emotion. Keep character dialogue clear.',
    educational: 'Speak in Turkish clearly and warmly, with a steady educational pace suitable for comprehension.',
    natural: 'Speak in Turkish with a warm, natural, flowing narrator voice. Keep pronunciation clear and pacing comfortable.'
  };

  const voiceTone = selected.id.includes('male')
    ? 'Use a masculine narrator quality.'
    : selected.id.includes('female')
      ? 'Use a feminine narrator quality.'
      : 'Use a neutral narrator quality.';

  return `${styleInstructions[style] || styleInstructions.natural} ${voiceTone}`;
}

async function fetchWithTimeout(url, options, timeoutMs = 180000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function createSpeechMp3({ input, episodeId, voiceProfile, voice, model, style }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY tanımlı değil. Backend .env dosyasına API key eklenmeli.');

  const selectedVoice = getVoiceProfile(voiceProfile || voice || process.env.OPENAI_TTS_VOICE || 'female_soft');
  const selectedModel = model || process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
  const selectedVoiceId = selectedVoice.voice;
  const instructions = buildInstructions({ style, voiceProfile: selectedVoice.id });
  const chunks = chunkForTts(input);
  if (!chunks.length) throw new Error('Seslendirilecek temiz metin boş. Prodüksiyon notları dışında metin bulunamadı.');

  const uploadRoot = process.env.UPLOAD_ROOT || './uploads';
  const audioDir = path.resolve(process.cwd(), uploadRoot, 'audio');
  await fs.mkdir(audioDir, { recursive: true });

  console.log(`[TTS] Başladı | episode=${episodeId || 'test'} | model=${selectedModel} | voice=${selectedVoiceId} | chunks=${chunks.length}`);

  const outputBuffers = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const payload = {
      model: selectedModel,
      voice: selectedVoiceId,
      input: chunks[i],
      response_format: 'mp3'
    };

    // gpt-4o-mini-tts tarzı modellerde yönlendirme talimatı desteklenir. Eski TTS modellerinde sorun çıkarmaması için
    // tts-1 / tts-1-hd seçilirse instructions göndermiyoruz.
    if (!/^tts-1/.test(selectedModel)) payload.instructions = instructions;

    console.log(`[TTS] Parça ${i + 1}/${chunks.length} gönderiliyor | chars=${chunks[i].length}`);

    const response = await fetchWithTimeout('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[TTS] OpenAI hata | status=${response.status} | ${errorText}`);
      throw new Error(`OpenAI TTS hatası (${response.status}): ${errorText || response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length < 500) {
      throw new Error(`OpenAI yanıtı çok küçük görünüyor (${buffer.length} byte). Ses dosyası oluşturulamadı.`);
    }
    outputBuffers.push(buffer);
    console.log(`[TTS] Parça ${i + 1}/${chunks.length} alındı | bytes=${buffer.length}`);
  }

  const filename = `episode-${episodeId || 'test'}-${crypto.randomUUID()}.mp3`;
  const absolutePath = path.join(audioDir, filename);
  const finalBuffer = Buffer.concat(outputBuffers);
  await fs.writeFile(absolutePath, finalBuffer);
  const stat = await fs.stat(absolutePath);

  if (!stat.size || stat.size < 500) throw new Error('MP3 dosyası yazıldı ama boyutu geçersiz görünüyor.');

  console.log(`[TTS] Tamamlandı | file=${absolutePath} | bytes=${stat.size}`);

  return {
    filename,
    absolutePath,
    bytes: stat.size,
    audioUrl: publicUploadUrl('audio', filename),
    model: selectedModel,
    voice: selectedVoiceId,
    voiceProfile: selectedVoice.id,
    voiceLabel: selectedVoice.label,
    chunkCount: chunks.length,
    instructions
  };
}

module.exports = { createSpeechMp3, chunkForTts, buildInstructions };
