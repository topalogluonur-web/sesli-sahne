const express = require('express');
const { db, nowIso } = require('../db');
const { safeInt, safeBool } = require('../utils');

const router = express.Router();

function profileIdFrom(req) {
  return safeInt(req.query.profile_id ?? req.body?.profile_id, 1) || 1;
}

router.get('/', (req, res) => {
  const profileId = profileIdFrom(req);
  const items = db.prepare(`
    SELECT
      h.*,
      e.title AS episode_title,
      e.episode_no,
      e.audio_url,
      e.duration_seconds,
      c.id AS content_id,
      c.title AS content_title,
      c.description AS content_description,
      c.audience_type,
      c.category_id,
      c.cover_image_url,
      cat.name AS category_name
    FROM listening_history h
    JOIN episodes e ON e.id = h.episode_id
    JOIN contents c ON c.id = e.content_id
    LEFT JOIN categories cat ON cat.id = c.category_id
    WHERE h.profile_id = ?
    ORDER BY h.updated_at DESC
    LIMIT 30
  `).all(profileId);

  res.json({ data: items });
});

router.get('/summary', (req, res) => {
  const profileId = profileIdFrom(req);
  const rows = db.prepare(`
    SELECT h.progress_seconds, h.completed, e.id AS episode_id, e.duration_seconds, c.id AS content_id
    FROM listening_history h
    JOIN episodes e ON e.id = h.episode_id
    JOIN contents c ON c.id = e.content_id
    WHERE h.profile_id = ?
  `).all(profileId);
  const uniqueContents = new Set(rows.map((row) => row.content_id));
  const totalProgressSeconds = rows.reduce((sum, row) => sum + Math.max(0, Number(row.progress_seconds || 0)), 0);
  const completedEpisodes = rows.filter((row) => Number(row.completed) === 1).length;
  res.json({ data: { profile_id: profileId, listened_books: uniqueContents.size, listened_episodes: rows.length, completed_episodes: completedEpisodes, total_progress_seconds: totalProgressSeconds } });
});

router.get('/content/:contentId', (req, res) => {
  const profileId = profileIdFrom(req);
  const contentId = safeInt(req.params.contentId);
  const items = db.prepare(`
    SELECT
      h.id,
      h.progress_seconds,
      h.completed,
      h.updated_at,
      e.id AS episode_id,
      e.title AS episode_title,
      e.episode_no,
      e.duration_seconds,
      c.id AS content_id,
      c.title AS content_title
    FROM episodes e
    JOIN contents c ON c.id = e.content_id
    LEFT JOIN listening_history h ON h.episode_id = e.id AND h.profile_id = ?
    WHERE e.content_id = ?
    ORDER BY e.episode_no ASC, e.id ASC
  `).all(profileId, contentId).map((row) => ({
    ...row,
    profile_id: profileId,
    progress_seconds: row.progress_seconds || 0,
    completed: row.completed || 0,
    updated_at: row.updated_at || null
  }));
  const totalDuration = items.reduce((sum, item) => sum + Math.max(0, Number(item.duration_seconds || 0)), 0);
  const totalProgress = items.reduce((sum, item) => sum + Math.max(0, Number(item.progress_seconds || 0)), 0);
  const completedEpisodes = items.filter((item) => Number(item.completed) === 1).length;
  res.json({ data: { content_id: contentId, profile_id: profileId, total_duration_seconds: totalDuration, total_progress_seconds: totalProgress, progress_percent: totalDuration > 0 ? Math.min(100, Math.round((totalProgress / totalDuration) * 100)) : 0, completed_episodes: completedEpisodes, episodes: items } });
});

router.post('/episodes/:episodeId', (req, res) => {
  const profileId = profileIdFrom(req);
  const episodeId = safeInt(req.params.episodeId);
  const progressSeconds = Math.max(0, safeInt(req.body.progress_seconds, 0) || 0);
  const completed = safeBool(req.body.completed) ? 1 : 0;
  const timestamp = nowIso();

  const episode = db.prepare('SELECT id FROM episodes WHERE id = ?').get(episodeId);
  if (!episode) return res.status(404).json({ error: 'Bölüm bulunamadı.' });

  const existing = db.prepare('SELECT id FROM listening_history WHERE profile_id = ? AND episode_id = ?').get(profileId, episodeId);
  if (existing) {
    db.prepare(`
      UPDATE listening_history
      SET progress_seconds = ?, completed = ?, updated_at = ?
      WHERE id = ?
    `).run(progressSeconds, completed, timestamp, existing.id);
    return res.json({ data: db.prepare('SELECT * FROM listening_history WHERE id = ?').get(existing.id) });
  }

  const result = db.prepare(`
    INSERT INTO listening_history (profile_id, episode_id, progress_seconds, completed, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(profileId, episodeId, progressSeconds, completed, timestamp);

  const history = db.prepare('SELECT * FROM listening_history WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ data: history });
});

module.exports = router;
