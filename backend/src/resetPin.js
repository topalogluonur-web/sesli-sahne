require('dotenv').config();
const { db, nowIso } = require('./db');

const timestamp = nowIso();
const count = db.prepare('SELECT COUNT(*) AS count FROM profiles').get().count;

if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO profiles (name, audience_type, age_min, age_max, avatar_emoji, pin_code, pin_enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run('Minik Dinleyici', 'child', 3, 8, '🧸', null, 0, timestamp, timestamp);
  insert.run('Yetişkin', 'adult', null, null, '🎧', '0000', 1, timestamp, timestamp);
  insert.run('Aile', 'family', null, null, '🏡', '0000', 1, timestamp, timestamp);
} else {
  db.prepare(`UPDATE profiles SET pin_code = '0000', pin_enabled = 1, updated_at = ? WHERE audience_type IN ('adult', 'family')`).run(timestamp);
  db.prepare(`UPDATE profiles SET pin_code = NULL, pin_enabled = 0, updated_at = ? WHERE audience_type = 'child'`).run(timestamp);

  const adultCount = db.prepare("SELECT COUNT(*) AS count FROM profiles WHERE audience_type = 'adult'").get().count;
  const familyCount = db.prepare("SELECT COUNT(*) AS count FROM profiles WHERE audience_type = 'family'").get().count;
  const insert = db.prepare(`
    INSERT INTO profiles (name, audience_type, age_min, age_max, avatar_emoji, pin_code, pin_enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  if (adultCount === 0) insert.run('Yetişkin', 'adult', null, null, '🎧', '0000', 1, timestamp, timestamp);
  if (familyCount === 0) insert.run('Aile', 'family', null, null, '🏡', '0000', 1, timestamp, timestamp);
}

console.log('PIN reset tamamlandı. Yetişkin ve Aile PIN: 0000');
console.table(db.prepare('SELECT id, name, audience_type, pin_enabled, pin_code FROM profiles ORDER BY id').all());
