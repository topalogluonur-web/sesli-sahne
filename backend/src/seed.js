require('dotenv').config();
const { db, nowIso } = require('./db');
const { createNarrationScript } = require('./services/textTools');

const category = db.prepare('SELECT id FROM categories WHERE slug = ?').get('uyku-masallari');
const exists = db.prepare('SELECT id FROM contents WHERE title = ?').get('Ay Bahçesine Yolculuk');

if (exists) {
  console.log('Örnek içerik zaten var.');
  process.exit(0);
}

const timestamp = nowIso();
const contentResult = db.prepare(`
  INSERT INTO contents
    (title, description, audience_type, age_min, age_max, category_id, is_premium, status, source_type, created_at, updated_at)
  VALUES (?, ?, 'child', 4, 8, ?, 0, 'published', 'manual', ?, ?)
`).run(
  'Ay Bahçesine Yolculuk',
  'Uyku öncesi için sakin, kısa ve yumuşak tempolu bir çocuk masalı.',
  category?.id || null,
  timestamp,
  timestamp
);

const rawText = `Gece, küçük kasabanın üzerine yumuşacık bir battaniye gibi serilmişti.

Arda odasında uykuya hazırlanırken, penceresinden içeri gümüş renkli bir ışık süzüldü. Işık, oyuncak ayısı Pofuduk'un burnuna dokundu.

Pofuduk birden gözlerini açtı ve kısık bir sesle konuştu: "Arda, bu gece Ay Bahçesi bizi bekliyor."

Arda şaşırdı ama hiç korkmadı. Çünkü Pofuduk'un sesi, en sevdiği ninni kadar sakindi.`;

db.prepare(`
  INSERT INTO episodes
    (content_id, title, episode_no, raw_text, narration_script, status, created_at, updated_at)
  VALUES (?, ?, 1, ?, ?, 'ready_for_tts', ?, ?)
`).run(
  contentResult.lastInsertRowid,
  'Bölüm 1 - Pofuduk Uyanıyor',
  rawText,
  createNarrationScript(rawText, 'child'),
  timestamp,
  timestamp
);

console.log('Örnek içerik eklendi.');
