const express = require('express');
const path = require('path');
const multer = require('multer');
const { db, nowIso } = require('../db');
const { safeInt, publicUploadUrl } = require('../utils');

const router = express.Router();

const uploadRoot = process.env.UPLOAD_ROOT || './uploads';
const coversDir = path.resolve(process.cwd(), uploadRoot, 'covers');
const audioDir = path.resolve(process.cwd(), uploadRoot, 'audio');

function cleanFilenamePart(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'file';
}

const coverStorage = multer.diskStorage({
  destination: coversDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-cover${ext}`);
  }
});

const audioStorage = multer.diskStorage({
  destination: audioDir,
  filename: (req, file, cb) => {
    const episodeId = cleanFilenamePart(req.body?.episode_id || 'manual');
    const ext = path.extname(file.originalname || '').toLowerCase() || '.mp3';
    cb(null, `episode-${episodeId}-manual-${Date.now()}${ext}`);
  }
});

const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Sadece görsel dosyası yüklenebilir.'));
  }
});

const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 250 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const okExt = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm'].includes(ext);
    const okMime = /^audio\//.test(file.mimetype) || ['video/webm', 'application/octet-stream'].includes(file.mimetype);
    if (okExt || okMime) cb(null, true);
    else cb(new Error('Sadece ses dosyası yüklenebilir: mp3, wav, m4a, aac, ogg veya webm.'));
  }
});

router.post('/covers', uploadCover.single('cover'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Kapak görseli zorunludur.' });

  const contentId = safeInt(req.body.content_id);
  const coverUrl = publicUploadUrl('covers', req.file.filename);

  if (contentId) {
    const result = db.prepare('UPDATE contents SET cover_image_url = ?, updated_at = ? WHERE id = ?')
      .run(coverUrl, nowIso(), contentId);

    if (result.changes === 0) return res.status(404).json({ error: 'İçerik bulunamadı.' });
  }

  res.status(201).json({ data: { url: coverUrl, filename: req.file.filename, content_id: contentId || null } });
});

router.post('/audio', uploadAudio.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Ses dosyası zorunludur.' });

  const episodeId = safeInt(req.body.episode_id);
  if (!episodeId) return res.status(400).json({ error: 'episode_id zorunludur.' });

  const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(episodeId);
  if (!episode) return res.status(404).json({ error: 'Bölüm bulunamadı.' });

  const audioUrl = publicUploadUrl('audio', req.file.filename);
  db.prepare(`
    UPDATE episodes
    SET audio_url = ?, status = 'audio_generated', updated_at = ?
    WHERE id = ?
  `).run(audioUrl, nowIso(), episodeId);

  const updated = db.prepare('SELECT * FROM episodes WHERE id = ?').get(episodeId);
  res.status(201).json({
    data: {
      episode: updated,
      audio: {
        url: audioUrl,
        filename: req.file.filename,
        original_name: req.file.originalname,
        mimetype: req.file.mimetype,
        bytes: req.file.size
      }
    }
  });
});

router.delete('/audio/:episodeId', (req, res) => {
  const episodeId = safeInt(req.params.episodeId);
  const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(episodeId);
  if (!episode) return res.status(404).json({ error: 'Bölüm bulunamadı.' });

  db.prepare(`
    UPDATE episodes
    SET audio_url = NULL,
        duration_seconds = NULL,
        status = CASE WHEN narration_script IS NOT NULL AND narration_script != '' THEN 'ready_for_tts' ELSE 'draft' END,
        updated_at = ?
    WHERE id = ?
  `).run(nowIso(), episodeId);

  const updated = db.prepare('SELECT * FROM episodes WHERE id = ?').get(episodeId);
  res.json({ data: updated });
});

module.exports = router;
