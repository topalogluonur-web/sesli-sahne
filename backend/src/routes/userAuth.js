const express = require('express');
const { db } = require('../db');
const { createSession, getAuthenticatedUser, loginUser, registerUser } = require('../userAuth');

const router = express.Router();

router.post('/register', (req, res) => {
  try {
    const user = registerUser(req.body || {});
    const session = createSession(user.id);
    res.status(201).json({ data: { user, token: session.token, expires_at: session.expires_at } });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Kayıt başarısız.' });
  }
});

router.post('/login', (req, res) => {
  try {
    const user = loginUser(req.body || {});
    const session = createSession(user.id);
    res.json({ data: { user, token: session.token, expires_at: session.expires_at } });
  } catch (err) {
    res.status(401).json({ error: err.message || 'Giriş başarısız.' });
  }
});

router.get('/me', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Oturum yok veya süresi dolmuş.' });
  res.json({ data: { user } });
});

router.post('/logout', (req, res) => {
  const header = req.headers.authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  if (match) db.prepare('DELETE FROM user_sessions WHERE token = ?').run(match[1]);
  res.json({ data: { ok: true } });
});

router.post('/demo-login', (req, res) => {
  const user = db.prepare('SELECT id, email, name, status, created_at, updated_at FROM user_accounts WHERE email = ?').get('demo@seslisahne.local');
  if (!user) return res.status(404).json({ error: 'Demo kullanıcı bulunamadı.' });
  const session = createSession(user.id);
  res.json({ data: { user, token: session.token, expires_at: session.expires_at } });
});

module.exports = router;
