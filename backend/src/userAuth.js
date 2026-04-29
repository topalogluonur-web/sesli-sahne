const crypto = require('crypto');
const { db, nowIso } = require('./db');
const { hashPassword, verifyPassword } = require('./auth');

const SESSION_DAYS = Number(process.env.USER_SESSION_DAYS || 30);

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function safeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO user_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(token, userId, createdAt, expiresAt);
  return { token, expires_at: expiresAt };
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.*
    FROM user_sessions s
    JOIN user_accounts u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ? AND u.status = 'active'
  `).get(token, nowIso());
  return row ? safeUser(row) : null;
}

function requireUserAuth(req, res, next) {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Kullanıcı oturumu gerekli.' });
  req.appUser = user;
  next();
}

function createDefaultProfilesForUser(userId) {
  const count = db.prepare('SELECT COUNT(*) AS count FROM profiles WHERE user_id = ?').get(userId).count;
  if (count > 0) return;
  const timestamp = nowIso();
  const insert = db.prepare(`
    INSERT INTO profiles (user_id, name, audience_type, age_min, age_max, avatar_emoji, pin_code, pin_enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const profiles = [
    ['Çocuk Profili', 'child', 3, 8, '🧸', null, 0],
    ['Yetişkin', 'adult', null, null, '🎧', '0000', 1],
    ['Aile', 'family', null, null, '🏡', '0000', 1]
  ];
  const tx = db.transaction(() => {
    for (const item of profiles) insert.run(userId, ...item, timestamp, timestamp);
  });
  tx();
}

function registerUser({ email, name, password }) {
  const normalizedEmail = normalizeEmail(email);
  const cleanName = String(name || '').trim();
  const cleanPassword = String(password || '');
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error('Geçerli bir e-posta adresi girin.');
  if (!cleanName) throw new Error('Ad soyad zorunlu.');
  if (cleanPassword.length < 4) throw new Error('Şifre en az 4 karakter olmalı.');
  const exists = db.prepare('SELECT id FROM user_accounts WHERE email = ?').get(normalizedEmail);
  if (exists) throw new Error('Bu e-posta ile kullanıcı zaten var.');
  const timestamp = nowIso();
  const result = db.prepare(`
    INSERT INTO user_accounts (email, name, password_hash, status, created_at, updated_at)
    VALUES (?, ?, ?, 'active', ?, ?)
  `).run(normalizedEmail, cleanName, hashPassword(cleanPassword), timestamp, timestamp);
  createDefaultProfilesForUser(result.lastInsertRowid);
  return safeUser(db.prepare('SELECT * FROM user_accounts WHERE id = ?').get(result.lastInsertRowid));
}

function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const user = db.prepare('SELECT * FROM user_accounts WHERE email = ? AND status = ?').get(normalizedEmail, 'active');
  if (!user || !verifyPassword(String(password || ''), user.password_hash)) {
    throw new Error('E-posta veya şifre hatalı.');
  }
  createDefaultProfilesForUser(user.id);
  return safeUser(user);
}

module.exports = {
  normalizeEmail,
  safeUser,
  createSession,
  getAuthenticatedUser,
  requireUserAuth,
  createDefaultProfilesForUser,
  registerUser,
  loginUser
};
