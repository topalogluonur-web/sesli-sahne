const express = require('express');
const { db, nowIso } = require('../db');
const { safeInt } = require('../utils');
const {
  OPENAI_TTS_VOICES,
  analyzeContent,
  createEnhancedNarrationScript,
  estimateSpeechQuality
} = require('../services/studioService');

const router = express.Router();

function loadContentWithEpisodes(contentId) {
  const content = db.prepare(`
    SELECT c.*, cat.name AS category_name
    FROM contents c
    LEFT JOIN categories cat ON cat.id = c.category_id
    WHERE c.id = ?
  `).get(contentId);
  if (!content) return null;
  const episodes = db.prepare('SELECT * FROM episodes WHERE content_id = ? ORDER BY episode_no ASC, id ASC').all(contentId);
  return { content, episodes };
}

router.get('/voices', (req, res) => {
  res.json({ data: OPENAI_TTS_VOICES });
});

router.get('/contents/:contentId/analyze', (req, res) => {
  const contentId = safeInt(req.params.contentId);
  const loaded = loadContentWithEpisodes(contentId);
  if (!loaded) return res.status(404).json({ error: 'İçerik bulunamadı.' });

  res.json({ data: analyzeContent(loaded.content, loaded.episodes) });
});


router.post('/episodes/:episodeId/preview-speech', (req, res) => {
  const episodeId = safeInt(req.params.episodeId);
  const episode = db.prepare('SELECT e.*, c.audience_type FROM episodes e JOIN contents c ON c.id = e.content_id WHERE e.id = ?').get(episodeId);
  if (!episode) return res.status(404).json({ error: 'Bölüm bulunamadı.' });

  const source = req.body?.input || episode.narration_script || episode.raw_text || '';
  const quality = estimateSpeechQuality(source, {
    audienceType: episode.audience_type,
    style: req.body?.style || 'natural',
    pause_level: req.body?.pause_level || 'normal'
  });

  res.json({ data: quality });
});

router.post('/contents/:contentId/preview-speech', (req, res) => {
  const contentId = safeInt(req.params.contentId);
  const loaded = loadContentWithEpisodes(contentId);
  if (!loaded) return res.status(404).json({ error: 'İçerik bulunamadı.' });

  const previews = loaded.episodes.map((episode) => ({
    episode_id: episode.id,
    title: episode.title,
    ...estimateSpeechQuality(episode.narration_script || episode.raw_text || '', {
      audienceType: loaded.content.audience_type,
      style: req.body?.style || 'natural',
      pause_level: req.body?.pause_level || 'normal'
    })
  }));

  res.json({ data: { content_id: contentId, episodes: previews } });
});

router.post('/episodes/:episodeId/prepare', (req, res) => {
  const episodeId = safeInt(req.params.episodeId);
  const episode = db.prepare('SELECT e.*, c.audience_type FROM episodes e JOIN contents c ON c.id = e.content_id WHERE e.id = ?').get(episodeId);
  if (!episode) return res.status(404).json({ error: 'Bölüm bulunamadı.' });

  const script = createEnhancedNarrationScript(episode.raw_text || episode.narration_script || '', {
    audienceType: episode.audience_type,
    style: req.body.style || 'natural',
    voiceProfile: req.body.voice_profile || req.body.voice || 'female_soft',
    pause_level: req.body.pause_level || req.body.pauseLevel || 'normal'
  });

  db.prepare(`
    UPDATE episodes
    SET narration_script = ?, status = 'ready_for_tts', updated_at = ?
    WHERE id = ?
  `).run(script, nowIso(), episodeId);

  const updated = db.prepare('SELECT * FROM episodes WHERE id = ?').get(episodeId);
  res.json({ data: updated });
});

router.post('/contents/:contentId/prepare-all', (req, res) => {
  const contentId = safeInt(req.params.contentId);
  const loaded = loadContentWithEpisodes(contentId);
  if (!loaded) return res.status(404).json({ error: 'İçerik bulunamadı.' });

  const timestamp = nowIso();
  const update = db.prepare(`
    UPDATE episodes
    SET narration_script = ?, status = 'ready_for_tts', updated_at = ?
    WHERE id = ?
  `);

  const transaction = db.transaction((episodes) => {
    for (const episode of episodes) {
      const script = createEnhancedNarrationScript(episode.raw_text || episode.narration_script || '', {
        audienceType: loaded.content.audience_type,
        style: req.body.style || 'natural',
        voiceProfile: req.body.voice_profile || req.body.voice || 'female_soft',
        pause_level: req.body.pause_level || req.body.pauseLevel || 'normal'
      });
      update.run(script, timestamp, episode.id);
    }
  });

  transaction(loaded.episodes);

  const refreshed = loadContentWithEpisodes(contentId);
  res.json({ data: { content: refreshed.content, episodes: refreshed.episodes, analysis: analyzeContent(refreshed.content, refreshed.episodes) } });
});

module.exports = router;
