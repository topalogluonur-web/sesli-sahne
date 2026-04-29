const express = require('express');
const { db, nowIso } = require('../db');
const { createToken, getAuthenticatedAdmin, hashPassword, verifyPassword } = require('../auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (!username || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre zorunludur.' });
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
  }
  const safeUser = { id: user.id, username: user.username, role: user.role, created_at: user.created_at, updated_at: user.updated_at };
  res.json({ data: { token: createToken(safeUser), user: safeUser } });
});

router.get('/me', (req, res) => {
  const user = getAuthenticatedAdmin(req);
  if (!user) return res.status(401).json({ error: 'Oturum geçersiz veya süresi dolmuş.' });
  res.json({ data: { user } });
});

router.post('/change-password', (req, res) => {
  const user = getAuthenticatedAdmin(req);
  if (!user) return res.status(401).json({ error: 'Oturum gerekli.' });
  const currentPassword = String(req.body?.current_password || '');
  const newPassword = String(req.body?.new_password || '');
  if (newPassword.length < 4) return res.status(400).json({ error: 'Yeni şifre en az 4 karakter olmalıdır.' });
  const fullUser = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(user.id);
  if (!fullUser || !verifyPassword(currentPassword, fullUser.password_hash)) {
    return res.status(401).json({ error: 'Mevcut şifre hatalı.' });
  }
  db.prepare('UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .run(hashPassword(newPassword), nowIso(), user.id);
  res.json({ data: { ok: true } });
});

module.exports = router;
