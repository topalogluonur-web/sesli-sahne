require('dotenv').config();
const { db, nowIso } = require('../src/db');
const timestamp = nowIso();
db.prepare("UPDATE profiles SET pin_code = '0000', pin_enabled = 1, updated_at = ? WHERE audience_type IN ('adult', 'family')").run(timestamp);
db.prepare("UPDATE profiles SET pin_code = NULL, pin_enabled = 0, updated_at = ? WHERE audience_type = 'child'").run(timestamp);
console.table(db.prepare('SELECT id, name, audience_type, pin_enabled, pin_code FROM profiles ORDER BY id').all());
console.log('PIN reset tamam. Yetişkin/Aile: 0000, Çocuk: PIN kapalı.');
