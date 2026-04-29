const express = require('express');
const { db, nowIso } = require('../db');
const { safeInt } = require('../utils');

const router = express.Router();

function profileIdFrom(req) {
  return safeInt(req.query.profile_id ?? req.body?.profile_id, 1) || 1;
}

router.get('/', (req, res) => {
  const profileId = profileIdFrom(req);
  const includeArchived = String(req.query.include_archived || '').toLowerCase() === 'true';
  const whereStatus = includeArchived ? '' : "AND c.status = 'published'";

  const items = db.prepare(`
    SELECT
      f.id AS favorite_id,
      f.profile_id,
      f.content_id,
      f.created_at AS favorite_created_at,
      c.id,
      c.title,
      c.description,
      c.audience_type,
      c.age_min,
      c.age_max,
      c.category_id,
      c.cover_image_url,
      c.is_premium,
      c.status,
      c.updated_at,
      cat.name AS category_name,
      COUNT(e.id) AS episode_count
    FROM favorites f
    JOIN contents c ON c.id = f.content_id
    LEFT JOIN categories cat ON cat.id = c.category_id
    LEFT JOIN episodes e ON e.content_id = c.id
    WHERE f.profile_id = ? ${whereStatus}
    GROUP BY f.id, c.id
    ORDER BY f.created_at DESC
  `).all(profileId);

  res.json({ data: items });
});

router.post('/:contentId', (req, res) => {
  const profileId = profileIdFrom(req);
  const contentId = safeInt(req.params.contentId);
  const content = db.prepare('SELECT id FROM contents WHERE id = ?').get(contentId);
  if (!content) return res.status(404).json({ error: 'İçerik bulunamadı.' });

  const existing = db.prepare('SELECT * FROM favorites WHERE profile_id = ? AND content_id = ?').get(profileId, contentId);
  if (existing) return res.json({ data: existing });

  const result = db.prepare('INSERT INTO favorites (profile_id, content_id, created_at) VALUES (?, ?, ?)')
    .run(profileId, contentId, nowIso());
  const favorite = db.prepare('SELECT * FROM favorites WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ data: favorite });
});

router.delete('/:contentId', (req, res) => {
  const profileId = profileIdFrom(req);
  const contentId = safeInt(req.params.contentId);
  db.prepare('DELETE FROM favorites WHERE profile_id = ? AND content_id = ?').run(profileId, contentId);
  res.json({ ok: true });
});

module.exports = router;
