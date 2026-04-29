const express = require('express');
const { db, nowIso } = require('../db');
const { safeInt, safeBool } = require('../utils');
const { getAuthenticatedUser } = require('../userAuth');

const router = express.Router();
const ALLOWED_TYPES = new Set(['child', 'adult', 'family']);

function publicProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    audience_type: row.audience_type,
    age_min: row.age_min,
    age_max: row.age_max,
    avatar_emoji: row.avatar_emoji || '🎧',
    pin_enabled: Boolean(row.pin_enabled),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

router.get('/', (req, res) => {
  const user = getAuthenticatedUser(req);
  const rows = user
    ? db.prepare(`
        SELECT * FROM profiles
        WHERE user_id = ?
        ORDER BY CASE audience_type WHEN 'child' THEN 1 WHEN 'adult' THEN 2 ELSE 3 END, id ASC
      `).all(user.id)
    : db.prepare(`
        SELECT * FROM profiles
        ORDER BY CASE audience_type WHEN 'child' THEN 1 WHEN 'adult' THEN 2 ELSE 3 END, id ASC
      `).all();
  res.json({ data: rows.map(publicProfile) });
});

router.post('/', (req, res) => {
  const name = String(req.body.name || '').trim();
  const audienceType = String(req.body.audience_type || '').trim();
  const ageMin = req.body.age_min === '' || req.body.age_min == null ? null : safeInt(req.body.age_min);
  const ageMax = req.body.age_max === '' || req.body.age_max == null ? null : safeInt(req.body.age_max);
  const avatarEmoji = String(req.body.avatar_emoji || '🎧').trim().slice(0, 8) || '🎧';
  const pinEnabled = safeBool(req.body.pin_enabled) ? 1 : 0;
  const pinCode = pinEnabled ? String(req.body.pin_code || '').trim() : null;

  if (!name) return res.status(400).json({ error: 'Profil adı zorunlu.' });
  if (!ALLOWED_TYPES.has(audienceType)) return res.status(400).json({ error: 'Geçersiz profil tipi.' });
  if (pinEnabled && !/^\d{4,6}$/.test(pinCode)) return res.status(400).json({ error: 'PIN 4-6 rakam olmalı.' });

  const user = getAuthenticatedUser(req);
  const timestamp = nowIso();
  const result = db.prepare(`
    INSERT INTO profiles (user_id, name, audience_type, age_min, age_max, avatar_emoji, pin_code, pin_enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(user?.id || null, name, audienceType, ageMin, ageMax, avatarEmoji, pinCode, pinEnabled, timestamp, timestamp);

  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ data: publicProfile(profile) });
});

router.patch('/:id', (req, res) => {
  const id = safeInt(req.params.id);
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
  if (!profile) return res.status(404).json({ error: 'Profil bulunamadı.' });
  const user = getAuthenticatedUser(req);
  if (user && Number(profile.user_id) !== Number(user.id)) return res.status(403).json({ error: 'Bu profile erişim yetkiniz yok.' });

  const next = {
    name: req.body.name == null ? profile.name : String(req.body.name || '').trim(),
    audience_type: req.body.audience_type == null ? profile.audience_type : String(req.body.audience_type || '').trim(),
    age_min: req.body.age_min == null || req.body.age_min === '' ? null : safeInt(req.body.age_min),
    age_max: req.body.age_max == null || req.body.age_max === '' ? null : safeInt(req.body.age_max),
    avatar_emoji: req.body.avatar_emoji == null ? profile.avatar_emoji : String(req.body.avatar_emoji || '🎧').trim().slice(0, 8),
    pin_enabled: req.body.pin_enabled == null ? profile.pin_enabled : (safeBool(req.body.pin_enabled) ? 1 : 0),
    pin_code: req.body.pin_code == null ? profile.pin_code : String(req.body.pin_code || '').trim(),
    updated_at: nowIso()
  };

  if (!next.name) return res.status(400).json({ error: 'Profil adı zorunlu.' });
  if (!ALLOWED_TYPES.has(next.audience_type)) return res.status(400).json({ error: 'Geçersiz profil tipi.' });
  if (!next.pin_enabled) next.pin_code = null;
  if (next.pin_enabled && !/^\d{4,6}$/.test(next.pin_code || '')) return res.status(400).json({ error: 'PIN 4-6 rakam olmalı.' });

  db.prepare(`
    UPDATE profiles
    SET name = ?, audience_type = ?, age_min = ?, age_max = ?, avatar_emoji = ?, pin_code = ?, pin_enabled = ?, updated_at = ?
    WHERE id = ?
  `).run(next.name, next.audience_type, next.age_min, next.age_max, next.avatar_emoji, next.pin_code, next.pin_enabled, next.updated_at, id);

  res.json({ data: publicProfile(db.prepare('SELECT * FROM profiles WHERE id = ?').get(id)) });
});

router.post('/:id/verify-pin', (req, res) => {
  const id = safeInt(req.params.id);
  const pin = String(req.body.pin || '').trim();
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
  if (!profile) return res.status(404).json({ error: 'Profil bulunamadı.' });
  const user = getAuthenticatedUser(req);
  if (user && Number(profile.user_id) !== Number(user.id)) return res.status(403).json({ error: 'Bu profile erişim yetkiniz yok.' });
  if (!profile.pin_enabled) return res.json({ ok: true });
  if (String(profile.pin_code || '') !== pin) return res.status(401).json({ error: 'PIN hatalı.' });
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const id = safeInt(req.params.id);
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
  if (!profile) return res.status(404).json({ error: 'Profil bulunamadı.' });
  const user = getAuthenticatedUser(req);
  if (user && Number(profile.user_id) !== Number(user.id)) return res.status(403).json({ error: 'Bu profile erişim yetkiniz yok.' });
  const count = user
    ? db.prepare('SELECT COUNT(*) as count FROM profiles WHERE user_id = ?').get(user.id).count
    : db.prepare('SELECT COUNT(*) as count FROM profiles').get().count;
  if (count <= 1) return res.status(400).json({ error: 'Son profil silinemez.' });
  db.prepare('DELETE FROM favorites WHERE profile_id = ?').run(id);
  db.prepare('DELETE FROM listening_history WHERE profile_id = ?').run(id);
  db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
