const express = require('express');
const { db, nowIso } = require('../db');
const { safeInt } = require('../utils');
const { createNarrationScript } = require('../services/textTools');

const router = express.Router();

function normalizeEpisodeOrder(contentId) {
  const rows = db.prepare('SELECT id FROM episodes WHERE content_id = ? ORDER BY episode_no ASC, id ASC').all(contentId);
  const update = db.prepare('UPDATE episodes SET episode_no = ?, updated_at = ? WHERE id = ?');
  const timestamp = nowIso();
  rows.forEach((row, index) => update.run(index + 1, timestamp, row.id));
}

function episodeList(contentId) {
  return db.prepare('SELECT * FROM episodes WHERE content_id = ? ORDER BY episode_no ASC, id ASC').all(contentId);
}

router.get('/content/:contentId', (req, res) => {
  const contentId = safeInt(req.params.contentId);
  const episodes = episodeList(contentId);
  res.json({ data: episodes });
});

router.post('/content/:contentId/reorder', (req, res) => {
  const contentId = safeInt(req.params.contentId);
  const ids = Array.isArray(req.body?.episode_ids) ? req.body.episode_ids.map((id) => safeInt(id)).filter(Boolean) : [];
  const existing = episodeList(contentId);
  if (ids.length !== existing.length) {
    return res.status(400).json({ error: 'Tüm bölüm id listesini aynı uzunlukta göndermelisin.' });
  }
  const existingIds = new Set(existing.map((episode) => Number(episode.id)));
  if (!ids.every((id) => existingIds.has(Number(id)))) {
    return res.status(400).json({ error: 'Bölüm listesinde bu içeriğe ait olmayan id var.' });
  }
  const timestamp = nowIso();
  const update = db.prepare('UPDATE episodes SET episode_no = ?, updated_at = ? WHERE id = ?');
  const trx = db.transaction(() => ids.forEach((id, index) => update.run(index + 1, timestamp, id)));
  trx();
  res.json({ data: episodeList(contentId) });
});

router.get('/:id', (req, res) => {
  const id = safeInt(req.params.id);
  const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(id);
  if (!episode) return res.status(404).json({ error: 'Bölüm bulunamadı.' });
  res.json({ data: episode });
});

router.post('/content/:contentId', (req, res) => {
  const contentId = safeInt(req.params.contentId);
  const content = db.prepare('SELECT * FROM contents WHERE id = ?').get(contentId);
  if (!content) return res.status(404).json({ error: 'İçerik bulunamadı.' });

  const title = String(req.body.title || '').trim();
  const rawText = String(req.body.raw_text || '').trim();
  const episodeNo = safeInt(req.body.episode_no, 1);
  const narrationScript = String(req.body.narration_script || createNarrationScript(rawText, content.audience_type)).trim();

  if (!title) return res.status(400).json({ error: 'Bölüm başlığı zorunludur.' });

  const timestamp = nowIso();
  const result = db.prepare(`
    INSERT INTO episodes
      (content_id, title, episode_no, raw_text, narration_script, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'ready_for_tts', ?, ?)
  `).run(contentId, title, episodeNo, rawText, narrationScript, timestamp, timestamp);

  normalizeEpisodeOrder(contentId);
  const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ data: episode });
});

router.patch('/:id', (req, res) => {
  const id = safeInt(req.params.id);
  const existing = db.prepare('SELECT * FROM episodes WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Bölüm bulunamadı.' });

  const next = {
    title: req.body.title !== undefined ? String(req.body.title).trim() : existing.title,
    episode_no: req.body.episode_no !== undefined ? safeInt(req.body.episode_no, existing.episode_no) : existing.episode_no,
    raw_text: req.body.raw_text !== undefined ? String(req.body.raw_text).trim() : existing.raw_text,
    narration_script: req.body.narration_script !== undefined ? String(req.body.narration_script).trim() : existing.narration_script,
    status: req.body.status !== undefined ? String(req.body.status).trim() : existing.status
  };

  if (!['draft', 'ready_for_tts', 'audio_generated', 'published', 'archived', 'tts_failed'].includes(next.status)) {
    return res.status(400).json({ error: 'Geçersiz episode status.' });
  }

  db.prepare(`
    UPDATE episodes
    SET title = ?, episode_no = ?, raw_text = ?, narration_script = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(next.title, next.episode_no, next.raw_text, next.narration_script, next.status, nowIso(), id);

  normalizeEpisodeOrder(existing.content_id);
  const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(id);
  res.json({ data: episode });
});

router.patch('/:id/status', (req, res) => {
  const id = safeInt(req.params.id);
  const status = req.body.status;
  if (!['draft', 'ready_for_tts', 'audio_generated', 'published', 'archived', 'tts_failed'].includes(status)) {
    return res.status(400).json({ error: 'Geçersiz status.' });
  }

  const result = db.prepare('UPDATE episodes SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso(), id);
  if (result.changes === 0) return res.status(404).json({ error: 'Bölüm bulunamadı.' });

  const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(id);
  res.json({ data: episode });
});

router.post('/:id/move', (req, res) => {
  const id = safeInt(req.params.id);
  const direction = String(req.body?.direction || '').trim();
  const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(id);
  if (!episode) return res.status(404).json({ error: 'Bölüm bulunamadı.' });
  const list = episodeList(episode.content_id);
  const index = list.findIndex((item) => Number(item.id) === Number(id));
  if (index < 0) return res.status(404).json({ error: 'Bölüm listede bulunamadı.' });
  const swapIndex = direction === 'up' ? index - 1 : direction === 'down' ? index + 1 : -1;
  if (swapIndex < 0 || swapIndex >= list.length) return res.json({ data: list });
  const ids = list.map((item) => item.id);
  [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
  const timestamp = nowIso();
  const update = db.prepare('UPDATE episodes SET episode_no = ?, updated_at = ? WHERE id = ?');
  const trx = db.transaction(() => ids.forEach((episodeId, orderIndex) => update.run(orderIndex + 1, timestamp, episodeId)));
  trx();
  res.json({ data: episodeList(episode.content_id) });
});

function splitTextByPosition(text, requestedPosition) {
  const source = String(text || '').trim();
  if (source.length < 200) return null;
  let pos = safeInt(requestedPosition, 0);
  if (!pos || pos < 80 || pos > source.length - 80) {
    const mid = Math.floor(source.length / 2);
    const nextBreak = source.indexOf('\n\n', mid);
    const prevBreak = source.lastIndexOf('\n\n', mid);
    if (nextBreak > 80 && nextBreak < source.length - 80) pos = nextBreak;
    else if (prevBreak > 80 && prevBreak < source.length - 80) pos = prevBreak;
    else {
      const sentenceBreak = source.indexOf('. ', mid);
      pos = sentenceBreak > 80 && sentenceBreak < source.length - 80 ? sentenceBreak + 1 : mid;
    }
  }
  const first = source.slice(0, pos).trim();
  const second = source.slice(pos).trim();
  if (first.length < 50 || second.length < 50) return null;
  return { first, second };
}

router.post('/:id/split', (req, res) => {
  const id = safeInt(req.params.id);
  const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(id);
  if (!episode) return res.status(404).json({ error: 'Bölüm bulunamadı.' });
  const content = db.prepare('SELECT * FROM contents WHERE id = ?').get(episode.content_id);
  const split = splitTextByPosition(episode.raw_text || episode.narration_script, req.body?.position);
  if (!split) return res.status(400).json({ error: 'Bölüm bölünecek kadar uzun değil veya uygun bölme noktası bulunamadı.' });

  const timestamp = nowIso();
  const trx = db.transaction(() => {
    db.prepare('UPDATE episodes SET raw_text = ?, narration_script = ?, audio_url = NULL, duration_seconds = NULL, status = ?, updated_at = ? WHERE id = ?')
      .run(split.first, createNarrationScript(split.first, content?.audience_type || 'family'), 'ready_for_tts', timestamp, id);
    db.prepare('UPDATE episodes SET episode_no = episode_no + 1, updated_at = ? WHERE content_id = ? AND episode_no > ?')
      .run(timestamp, episode.content_id, episode.episode_no);
    db.prepare(`
      INSERT INTO episodes (content_id, title, episode_no, raw_text, narration_script, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'ready_for_tts', ?, ?)
    `).run(episode.content_id, `${episode.title} - Devam`, episode.episode_no + 1, split.second, createNarrationScript(split.second, content?.audience_type || 'family'), timestamp, timestamp);
    normalizeEpisodeOrder(episode.content_id);
  });
  trx();
  res.json({ data: episodeList(episode.content_id) });
});

router.post('/:id/merge-next', (req, res) => {
  const id = safeInt(req.params.id);
  const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(id);
  if (!episode) return res.status(404).json({ error: 'Bölüm bulunamadı.' });
  const content = db.prepare('SELECT * FROM contents WHERE id = ?').get(episode.content_id);
  const next = db.prepare('SELECT * FROM episodes WHERE content_id = ? AND episode_no > ? ORDER BY episode_no ASC, id ASC LIMIT 1').get(episode.content_id, episode.episode_no);
  if (!next) return res.status(400).json({ error: 'Birleştirilecek sonraki bölüm bulunamadı.' });
  const mergedRaw = [episode.raw_text, next.raw_text].filter(Boolean).join('\n\n');
  const mergedTitle = String(req.body?.title || episode.title || '').trim() || episode.title;
  const timestamp = nowIso();
  const trx = db.transaction(() => {
    db.prepare('UPDATE episodes SET title = ?, raw_text = ?, narration_script = ?, audio_url = NULL, duration_seconds = NULL, status = ?, updated_at = ? WHERE id = ?')
      .run(mergedTitle, mergedRaw, createNarrationScript(mergedRaw, content?.audience_type || 'family'), 'ready_for_tts', timestamp, episode.id);
    db.prepare('DELETE FROM episodes WHERE id = ?').run(next.id);
    normalizeEpisodeOrder(episode.content_id);
  });
  trx();
  res.json({ data: episodeList(episode.content_id) });
});

router.delete('/:id', (req, res) => {
  const id = safeInt(req.params.id);
  const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(id);
  const result = db.prepare('DELETE FROM episodes WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Bölüm bulunamadı.' });
  if (episode) normalizeEpisodeOrder(episode.content_id);
  res.json({ ok: true });
});

module.exports = router;
