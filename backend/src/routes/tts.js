const express = require('express');
const fs = require('fs');
const path = require('path');
const { db, nowIso } = require('../db');
const { safeInt } = require('../utils');
const { createSpeechMp3 } = require('../services/openaiTtsService');
const { createLocalSpeechWav, listWindowsVoices } = require('../services/localWindowsTtsService');
const { createEdgeSpeechMp3, listEdgeTurkishVoices } = require('../services/edgeTtsService');
const { createPythonEdgeSpeechMp3 } = require('../services/pythonEdgeTtsService');
const { getVoiceProfile } = require('../services/studioService');

const router = express.Router();

function getAudioDir() {
  const uploadRoot = process.env.UPLOAD_ROOT || './uploads';
  return path.resolve(process.cwd(), uploadRoot, 'audio');
}

function normalizeTtsOptions(options = {}) {
  const selectedVoice = getVoiceProfile(options.voice_profile || options.voice || process.env.OPENAI_TTS_VOICE || 'female_soft');
  const provider = options.provider || process.env.TTS_PROVIDER || 'edge_python';
  return {
    provider,
    voice_profile: selectedVoice.id,
    voice: selectedVoice.voice,
    model: provider === 'openai' ? (options.model || process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts') : ((provider === 'edge_online' || provider === 'edge_python') ? (provider === 'edge_python' ? 'python-edge-tts' : 'edge-online-readaloud') : 'local-windows-system-speech'),
    style: options.style || 'natural',
    local_voice_name: options.local_voice_name || process.env.LOCAL_TTS_VOICE_NAME || '',
    local_culture: options.local_culture || process.env.LOCAL_TTS_CULTURE || 'tr-TR',
    edge_voice_name: options.edge_voice_name || process.env.EDGE_TTS_VOICE_NAME || '',
    tts_rate: options.tts_rate || options.rate || process.env.EDGE_TTS_RATE || '',
    pause_level: options.pause_level || options.pauseLevel || process.env.EDGE_TTS_PAUSE_LEVEL || 'normal'
  };
}

async function createAudioWithProvider({ input, episodeId, normalized }) {
  if (normalized.provider === 'openai') {
    return createSpeechMp3({
      input,
      episodeId,
      model: normalized.model,
      voiceProfile: normalized.voice_profile,
      voice: normalized.voice,
      style: normalized.style
    });
  }

  if (normalized.provider === 'edge_python') {
    return createPythonEdgeSpeechMp3({
      input,
      episodeId,
      voiceProfile: normalized.voice_profile,
      voice: normalized.voice,
      style: normalized.style,
      edgeVoiceName: normalized.edge_voice_name,
      ttsRate: normalized.tts_rate,
      pauseLevel: normalized.pause_level
    });
  }

  if (normalized.provider === 'edge_online') {
    return createEdgeSpeechMp3({
      input,
      episodeId,
      voiceProfile: normalized.voice_profile,
      voice: normalized.voice,
      style: normalized.style,
      edgeVoiceName: normalized.edge_voice_name
    });
  }

  return createLocalSpeechWav({
    input,
    episodeId,
    voiceProfile: normalized.voice_profile,
    voice: normalized.voice,
    style: normalized.style,
    localVoiceName: normalized.local_voice_name,
    culture: normalized.local_culture
  });
}

async function generateEpisodeAudio(episode, options = {}) {
  const normalized = normalizeTtsOptions(options);
  const input = String(options.input || episode.narration_script || episode.raw_text || '').trim();
  if (!input) throw new Error('Seslendirilecek metin boş. Önce bölüm metni ekle veya Sese hazırla butonunu kullan.');

  const timestamp = nowIso();
  const jobResult = db.prepare(`
    INSERT INTO tts_jobs (episode_id, provider, model, voice, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'processing', ?, ?)
  `).run(episode.id, normalized.provider, normalized.model, normalized.voice, timestamp, timestamp);
  const jobId = jobResult.lastInsertRowid;

  console.log(`[TTS JOB ${jobId}] Bölüm ses üretimi başladı | provider=${normalized.provider} | episode=${episode.id} | title=${episode.title}`);

  try {
    const audio = await createAudioWithProvider({ input, episodeId: episode.id, normalized });

    db.prepare(`
      UPDATE episodes
      SET audio_url = ?, status = 'audio_generated', duration_seconds = COALESCE(duration_seconds, ?), updated_at = ?
      WHERE id = ?
    `).run(audio.audioUrl, null, nowIso(), episode.id);

    db.prepare(`
      UPDATE tts_jobs
      SET status = 'completed', audio_url = ?, model = ?, voice = ?, updated_at = ?
      WHERE id = ?
    `).run(audio.audioUrl, audio.model, audio.voice, nowIso(), jobId);

    const updatedEpisode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(episode.id);
    console.log(`[TTS JOB ${jobId}] Tamamlandı | audio=${audio.audioUrl} | bytes=${audio.bytes}`);
    return { job_id: jobId, episode: updatedEpisode, audio };
  } catch (error) {
    console.error(`[TTS JOB ${jobId}] Hata:`, error);
    db.prepare(`UPDATE episodes SET status = 'tts_failed', updated_at = ? WHERE id = ?`).run(nowIso(), episode.id);
    db.prepare(`UPDATE tts_jobs SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?`).run(error.message, nowIso(), jobId);
    throw Object.assign(error, { job_id: jobId });
  }
}

router.post('/episodes/:episodeId', async (req, res) => {
  const episodeId = safeInt(req.params.episodeId);
  const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(episodeId);
  if (!episode) return res.status(404).json({ error: 'Bölüm bulunamadı.' });

  try {
    const result = await generateEpisodeAudio(episode, req.body || {});
    res.json({ data: result });
  } catch (error) {
    res.status(400).json({ error: error.message, job_id: error.job_id });
  }
});

router.post('/contents/:contentId', async (req, res) => {
  const contentId = safeInt(req.params.contentId);
  const content = db.prepare('SELECT * FROM contents WHERE id = ?').get(contentId);
  if (!content) return res.status(404).json({ error: 'İçerik bulunamadı.' });

  const includeExisting = Boolean(req.body?.include_existing);
  const episodes = db.prepare('SELECT * FROM episodes WHERE content_id = ? ORDER BY episode_no ASC, id ASC').all(contentId)
    .filter((episode) => includeExisting || !episode.audio_url);

  const results = [];
  const errors = [];

  for (const episode of episodes) {
    try {
      const result = await generateEpisodeAudio(episode, req.body || {});
      results.push(result);
    } catch (error) {
      errors.push({ episode_id: episode.id, title: episode.title, error: error.message, job_id: error.job_id });
    }
  }

  const refreshedEpisodes = db.prepare('SELECT * FROM episodes WHERE content_id = ? ORDER BY episode_no ASC, id ASC').all(contentId);
  res.json({ data: { generated: results.length, errors, episodes: refreshedEpisodes } });
});

router.get('/local-voices', async (req, res) => {
  try {
    const voices = await listWindowsVoices();
    const trVoices = voices.filter((voice) => String(voice.culture || '').toLowerCase() === 'tr-tr');
    res.json({ data: { voices, trVoices, hasTurkishVoice: trVoices.length > 0, edgeVoices: listEdgeTurkishVoices() } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/test', async (req, res) => {
  try {
    const input = String(req.body?.input || 'Merhaba. Sesli Sahne için test ses kaydı başarıyla oluşturuluyor.').trim();
    const normalized = normalizeTtsOptions(req.body || {});
    const audio = await createAudioWithProvider({ input, episodeId: 'test', normalized });
    res.json({ data: { ok: true, audio } });
  } catch (error) {
    console.error('[TTS TEST] Hata:', error);
    res.status(400).json({ error: error.message });
  }
});

router.get('/jobs', (req, res) => {
  const jobs = db.prepare(`
    SELECT j.*, e.title AS episode_title, c.title AS content_title
    FROM tts_jobs j
    LEFT JOIN episodes e ON e.id = j.episode_id
    LEFT JOIN contents c ON c.id = e.content_id
    ORDER BY j.created_at DESC
    LIMIT 100
  `).all();
  res.json({ data: jobs });
});

router.get('/files', (req, res) => {
  const audioDir = getAudioDir();
  if (!fs.existsSync(audioDir)) return res.json({ data: [] });
  const files = fs.readdirSync(audioDir)
    .filter((filename) => /\.(mp3|wav)$/i.test(filename))
    .map((filename) => {
      const stat = fs.statSync(path.join(audioDir, filename));
      return { filename, bytes: stat.size, modified_at: stat.mtime.toISOString(), audio_url: `/uploads/audio/${filename}` };
    })
    .sort((a, b) => b.modified_at.localeCompare(a.modified_at));
  res.json({ data: files });
});

module.exports = router;
