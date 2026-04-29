const express = require('express');
const path = require('path');
const multer = require('multer');
const { db, nowIso } = require('../db');
const { safeInt, safeBool } = require('../utils');
const { extractTextFromPdf } = require('../services/pdfService');
const { splitTextIntoEpisodes, createNarrationScript } = require('../services/textTools');

const router = express.Router();

const uploadRoot = process.env.UPLOAD_ROOT || './uploads';
const pdfDir = path.resolve(process.cwd(), uploadRoot, 'pdf');

const storage = multer.diskStorage({
  destination: pdfDir,
  filename: (req, file, cb) => {
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ._-]+/g, '-');
    cb(null, `${Date.now()}-${safeOriginal}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece PDF yüklenebilir.'));
    }
  }
});

router.post('/pdf', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'PDF dosyası zorunludur.' });

  const title = String(req.body.title || req.file.originalname.replace(/\.pdf$/i, '')).trim();
  const description = String(req.body.description || '').trim();
  const audienceType = req.body.audience_type || 'family';
  const ageMin = safeInt(req.body.age_min);
  const ageMax = safeInt(req.body.age_max);
  const categoryId = safeInt(req.body.category_id);
  const isPremium = safeBool(req.body.is_premium) ? 1 : 0;

  if (!['child', 'adult', 'family'].includes(audienceType)) {
    return res.status(400).json({ error: 'audience_type child, adult veya family olmalıdır.' });
  }

  const timestamp = nowIso();

  try {
    const extracted = await extractTextFromPdf(req.file.path);
    const episodes = splitTextIntoEpisodes(extracted.text, { maxChars: 4500, minChars: 1600 });

    if (episodes.length === 0) {
      throw new Error('PDF içinden okunabilir metin çıkarılamadı. Dosya taranmış görsel olabilir; OCR eklenmesi gerekir.');
    }

    const transaction = db.transaction(() => {
      const contentResult = db.prepare(`
        INSERT INTO contents
          (title, description, audience_type, age_min, age_max, category_id, is_premium, status, source_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 'pdf', ?, ?)
      `).run(title, description, audienceType, ageMin, ageMax, categoryId, isPremium, timestamp, timestamp);

      const contentId = contentResult.lastInsertRowid;

      db.prepare(`
        INSERT INTO pdf_imports
          (content_id, original_filename, stored_filename, page_count, char_count, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'imported', ?)
      `).run(contentId, req.file.originalname, req.file.filename, extracted.pageCount, extracted.text.length, timestamp);

      const insertEpisode = db.prepare(`
        INSERT INTO episodes
          (content_id, title, episode_no, raw_text, narration_script, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'ready_for_tts', ?, ?)
      `);

      episodes.forEach((episode, index) => {
        insertEpisode.run(
          contentId,
          episode.title || `Bölüm ${index + 1}`,
          index + 1,
          episode.text,
          createNarrationScript(episode.text, audienceType),
          timestamp,
          timestamp
        );
      });

      return contentId;
    });

    const contentId = transaction();
    const content = db.prepare('SELECT * FROM contents WHERE id = ?').get(contentId);
    const createdEpisodes = db.prepare('SELECT * FROM episodes WHERE content_id = ? ORDER BY episode_no ASC').all(contentId);

    res.status(201).json({ data: { content, episodes: createdEpisodes, page_count: extracted.pageCount, char_count: extracted.text.length } });
  } catch (error) {
    db.prepare(`
      INSERT INTO pdf_imports
        (original_filename, stored_filename, status, error_message, created_at)
      VALUES (?, ?, 'failed', ?, ?)
    `).run(req.file.originalname, req.file.filename, error.message, timestamp);

    res.status(400).json({ error: error.message });
  }
});

router.get('/pdf', (req, res) => {
  const imports = db.prepare('SELECT * FROM pdf_imports ORDER BY created_at DESC LIMIT 100').all();
  res.json({ data: imports });
});

module.exports = router;
