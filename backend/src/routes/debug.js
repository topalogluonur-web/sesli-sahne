const express = require('express');
const path = require('path');
const { db, nowIso } = require('../db');

const router = express.Router();

function resetPins() {
  const timestamp = nowIso();
  db.prepare(`
    UPDATE profiles
    SET pin_code = '0000', pin_enabled = 1, updated_at = ?
    WHERE audience_type IN ('adult', 'family')
  `).run(timestamp);

  db.prepare(`
    UPDATE profiles
    SET pin_code = NULL, pin_enabled = 0, updated_at = ?
    WHERE audience_type = 'child'
  `).run(timestamp);
}

router.get('/', (req, res) => {
  const profiles = db.prepare(`
    SELECT id, name, audience_type, pin_enabled, pin_code, updated_at
    FROM profiles
    ORDER BY id ASC
  `).all();

  const counts = {
    categories: db.prepare('SELECT COUNT(*) AS count FROM categories').get().count,
    contents: db.prepare('SELECT COUNT(*) AS count FROM contents').get().count,
    episodes: db.prepare('SELECT COUNT(*) AS count FROM episodes').get().count,
    pdf_imports: db.prepare('SELECT COUNT(*) AS count FROM pdf_imports').get().count
  };

  res.json({
    ok: true,
    time: new Date().toISOString(),
    cwd: process.cwd(),
    database_path: path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/sesli-sahne.sqlite'),
    upload_root: path.resolve(process.cwd(), process.env.UPLOAD_ROOT || './uploads'),
    dev_pin_override: process.env.DEV_PIN_OVERRIDE !== '0',
    counts,
    profiles
  });
});

router.post('/reset-pin', (req, res) => {
  resetPins();
  res.json({ ok: true, message: 'PIN sıfırlandı. Yetişkin/Aile PIN: 0000; Çocuk PIN kapalı.' });
});

router.get('/reset-pin', (req, res) => {
  resetPins();
  res.json({ ok: true, message: 'PIN sıfırlandı. Yetişkin/Aile PIN: 0000; Çocuk PIN kapalı.' });
});

module.exports = router;
