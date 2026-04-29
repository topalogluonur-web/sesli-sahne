const express = require('express');
const { db, nowIso } = require('../db');
const { safeInt, safeBool } = require('../utils');

const router = express.Router();

function buildQualitySummary(content, episodes = null) {
  const episodeRows = episodes || db.prepare('SELECT * FROM episodes WHERE content_id = ? ORDER BY episode_no ASC, id ASC').all(content.id);
  const episodeCount = episodeRows.length;
  const audioCount = episodeRows.filter((episode) => episode.audio_url && String(episode.audio_url).trim()).length;
  const checks = [
    { key: 'title', label: 'Başlık', ok: Boolean(String(content.title || '').trim()) },
    { key: 'description', label: 'Açıklama', ok: Boolean(String(content.description || '').trim()) },
    { key: 'category', label: 'Kategori', ok: Boolean(content.category_id) },
    { key: 'cover', label: 'Kapak', ok: Boolean(String(content.cover_image_url || '').trim()) },
    { key: 'episodes', label: 'Bölüm', ok: episodeCount > 0, count: episodeCount },
    { key: 'audio', label: 'Ses', ok: episodeCount > 0 && audioCount === episodeCount, count: audioCount, total: episodeCount }
  ];
  const missing = checks.filter((check) => !check.ok).map((check) => check.label);
  const ready = missing.length === 0;
  const qualityStatus = content.status === 'published' ? 'published' : ready ? 'ready' : 'missing';
  return {
    quality_status: qualityStatus,
    ready,
    missing,
    episode_count: episodeCount,
    audio_count: audioCount,
    missing_audio_count: Math.max(0, episodeCount - audioCount),
    checks
  };
}

function enrichContentRow(row) {
  const episodeCount = Number(row.episode_count || 0);
  const audioCount = Number(row.audio_count || 0);
  const checksMissing = [];
  if (!String(row.title || '').trim()) checksMissing.push('Başlık');
  if (!String(row.description || '').trim()) checksMissing.push('Açıklama');
  if (!row.category_id) checksMissing.push('Kategori');
  if (!String(row.cover_image_url || '').trim()) checksMissing.push('Kapak');
  if (episodeCount <= 0) checksMissing.push('Bölüm');
  if (episodeCount <= 0 || audioCount !== episodeCount) checksMissing.push('Ses');
  const ready = checksMissing.length === 0;
  return {
    ...row,
    audio_count: audioCount,
    episode_count: episodeCount,
    missing_audio_count: Math.max(0, episodeCount - audioCount),
    quality_status: row.status === 'published' ? 'published' : ready ? 'ready' : 'missing',
    quality_missing: checksMissing.join(', ')
  };
}

router.get('/', (req, res) => {
  const audienceType = req.query.audience_type;
  const status = req.query.status;

  const where = [];
  const params = [];

  if (audienceType && ['child', 'adult', 'family'].includes(audienceType)) {
    where.push('c.audience_type = ?');
    params.push(audienceType);
  }

  if (status && ['draft', 'published', 'archived'].includes(status)) {
    where.push('c.status = ?');
    params.push(status);
  }

  const sql = `
    SELECT
      c.*,
      cat.name AS category_name,
      COUNT(e.id) AS episode_count,
      SUM(CASE WHEN e.audio_url IS NOT NULL AND e.audio_url != '' THEN 1 ELSE 0 END) AS audio_count
    FROM contents c
    LEFT JOIN categories cat ON cat.id = c.category_id
    LEFT JOIN episodes e ON e.content_id = c.id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;

  const contents = db.prepare(sql).all(...params).map(enrichContentRow);
  res.json({ data: contents });
});

router.get('/:id', (req, res) => {
  const id = safeInt(req.params.id);
  const content = db.prepare(`
    SELECT c.*, cat.name AS category_name
    FROM contents c
    LEFT JOIN categories cat ON cat.id = c.category_id
    WHERE c.id = ?
  `).get(id);

  if (!content) return res.status(404).json({ error: 'İçerik bulunamadı.' });

  const episodes = db.prepare('SELECT * FROM episodes WHERE content_id = ? ORDER BY episode_no ASC, id ASC').all(id);
  const quality = buildQualitySummary(content, episodes);
  res.json({ data: { ...content, episodes, quality } });
});

router.get('/:id/quality', (req, res) => {
  const id = safeInt(req.params.id);
  const content = db.prepare('SELECT * FROM contents WHERE id = ?').get(id);
  if (!content) return res.status(404).json({ error: 'İçerik bulunamadı.' });
  res.json({ data: buildQualitySummary(content) });
});

router.post('/', (req, res) => {
  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();
  const audienceType = req.body.audience_type || 'family';
  const ageMin = safeInt(req.body.age_min);
  const ageMax = safeInt(req.body.age_max);
  const categoryId = safeInt(req.body.category_id);
  const isPremium = safeBool(req.body.is_premium) ? 1 : 0;

  if (!title) return res.status(400).json({ error: 'Başlık zorunludur.' });
  if (!['child', 'adult', 'family'].includes(audienceType)) {
    return res.status(400).json({ error: 'audience_type child, adult veya family olmalıdır.' });
  }

  const timestamp = nowIso();
  const result = db.prepare(`
    INSERT INTO contents
      (title, description, audience_type, age_min, age_max, category_id, is_premium, status, source_type, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 'manual', ?, ?)
  `).run(title, description, audienceType, ageMin, ageMax, categoryId, isPremium, timestamp, timestamp);

  const content = db.prepare('SELECT * FROM contents WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ data: content });
});

router.patch('/:id', (req, res) => {
  const id = safeInt(req.params.id);
  const existing = db.prepare('SELECT * FROM contents WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'İçerik bulunamadı.' });

  const next = {
    title: req.body.title !== undefined ? String(req.body.title).trim() : existing.title,
    description: req.body.description !== undefined ? String(req.body.description).trim() : existing.description,
    audience_type: req.body.audience_type !== undefined ? String(req.body.audience_type).trim() : existing.audience_type,
    age_min: req.body.age_min !== undefined ? safeInt(req.body.age_min) : existing.age_min,
    age_max: req.body.age_max !== undefined ? safeInt(req.body.age_max) : existing.age_max,
    category_id: req.body.category_id !== undefined ? safeInt(req.body.category_id) : existing.category_id,
    cover_image_url: req.body.cover_image_url !== undefined ? String(req.body.cover_image_url).trim() : existing.cover_image_url,
    is_premium: req.body.is_premium !== undefined ? (safeBool(req.body.is_premium) ? 1 : 0) : existing.is_premium,
    status: req.body.status !== undefined ? String(req.body.status).trim() : existing.status
  };

  if (!next.title) return res.status(400).json({ error: 'Başlık zorunludur.' });
  if (!['child', 'adult', 'family'].includes(next.audience_type)) {
    return res.status(400).json({ error: 'audience_type child, adult veya family olmalıdır.' });
  }
  if (!['draft', 'published', 'archived'].includes(next.status)) {
    return res.status(400).json({ error: 'Geçersiz status.' });
  }

  db.prepare(`
    UPDATE contents
    SET title = ?, description = ?, audience_type = ?, age_min = ?, age_max = ?, category_id = ?, cover_image_url = ?, is_premium = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.title,
    next.description,
    next.audience_type,
    next.age_min,
    next.age_max,
    next.category_id,
    next.cover_image_url,
    next.is_premium,
    next.status,
    nowIso(),
    id
  );

  const content = db.prepare(`
    SELECT c.*, cat.name AS category_name
    FROM contents c
    LEFT JOIN categories cat ON cat.id = c.category_id
    WHERE c.id = ?
  `).get(id);

  res.json({ data: content });
});

router.post('/:id/library', (req, res) => {
  const id = safeInt(req.params.id);
  const content = db.prepare('SELECT * FROM contents WHERE id = ?').get(id);
  if (!content) return res.status(404).json({ error: 'İçerik bulunamadı.' });

  const episodes = db.prepare('SELECT * FROM episodes WHERE content_id = ? ORDER BY episode_no ASC, id ASC').all(id);
  const quality = buildQualitySummary(content, episodes);
  const allowIncomplete = safeBool(req.body?.allow_incomplete);
  const allowWithoutAudio = safeBool(req.body?.allow_without_audio);

  if (episodes.length === 0) {
    return res.status(400).json({ error: 'Kütüphaneye almak için en az bir bölüm olmalı.' });
  }

  if (!quality.ready && !allowIncomplete) {
    return res.status(400).json({
      error: 'Yayın kontrol listesinde eksikler var: ' + quality.missing.join(', ') + '. Yine de almak istiyorsan allow_incomplete=true gönder.',
      quality
    });
  }

  if (quality.missing_audio_count > 0 && !allowWithoutAudio && !allowIncomplete) {
    return res.status(400).json({
      error: quality.missing_audio_count + ' bölümde ses dosyası yok. Önce ses oluştur veya allow_without_audio=true gönder.',
      missing_episode_ids: episodes.filter((episode) => !episode.audio_url).map((episode) => episode.id),
      quality
    });
  }

  const timestamp = nowIso();
  const transaction = db.transaction(() => {
    db.prepare('UPDATE contents SET status = ?, updated_at = ? WHERE id = ?').run('published', timestamp, id);
    db.prepare(
      "UPDATE episodes " +
      "SET status = CASE WHEN audio_url IS NOT NULL AND audio_url != '' THEN 'published' ELSE status END, " +
      "updated_at = ? WHERE content_id = ?"
    ).run(timestamp, id);
  });
  transaction();

  const refreshed = db.prepare(`
    SELECT c.*, cat.name AS category_name
    FROM contents c
    LEFT JOIN categories cat ON cat.id = c.category_id
    WHERE c.id = ?
  `).get(id);
  const refreshedEpisodes = db.prepare('SELECT * FROM episodes WHERE content_id = ? ORDER BY episode_no ASC, id ASC').all(id);
  res.json({ data: { ...refreshed, episodes: refreshedEpisodes, quality: buildQualitySummary(refreshed, refreshedEpisodes) } });
});

router.patch('/:id/status', (req, res) => {
  const id = safeInt(req.params.id);
  const status = req.body.status;

  if (!['draft', 'published', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Geçersiz status.' });
  }

  const result = db.prepare('UPDATE contents SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso(), id);
  if (result.changes === 0) return res.status(404).json({ error: 'İçerik bulunamadı.' });

  const content = db.prepare('SELECT * FROM contents WHERE id = ?').get(id);
  res.json({ data: content });
});

router.delete('/:id', (req, res) => {
  const id = safeInt(req.params.id);
  const result = db.prepare('DELETE FROM contents WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'İçerik bulunamadı.' });
  res.json({ ok: true });
});

module.exports = router;
