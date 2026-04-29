require('dotenv').config();
const { db, nowIso } = require('./db');
const { hashPassword } = require('./auth');

const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_PASSWORD || '0000';
const existing = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
const timestamp = nowIso();
if (existing) {
  db.prepare('UPDATE admin_users SET password_hash = ?, role = ?, updated_at = ? WHERE username = ?')
    .run(hashPassword(password), 'admin', timestamp, username);
} else {
  db.prepare('INSERT INTO admin_users (username, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(username, hashPassword(password), 'admin', timestamp, timestamp);
}
console.log(`Admin giriş sıfırlandı: ${username} / ${password}`);
