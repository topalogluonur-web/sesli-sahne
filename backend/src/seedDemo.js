require('dotenv').config();
const { db, nowIso } = require('./db');
const { createNarrationScript } = require('./services/textTools');

function categoryIdByName(name) {
  return db.prepare('SELECT id FROM categories WHERE name = ?').get(name)?.id || null;
}

function upsertContent({ title, description, audienceType, ageMin, ageMax, categoryName, episodes }) {
  const existing = db.prepare('SELECT id FROM contents WHERE title = ?').get(title);
  const timestamp = nowIso();
  const categoryId = categoryIdByName(categoryName);
  let contentId = existing?.id;

  if (!contentId) {
    const result = db.prepare(`
      INSERT INTO contents
        (title, description, audience_type, age_min, age_max, category_id, is_premium, status, source_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 'published', 'manual', ?, ?)
    `).run(title, description, audienceType, ageMin, ageMax, categoryId, timestamp, timestamp);
    contentId = result.lastInsertRowid;
  } else {
    db.prepare(`
      UPDATE contents
      SET description = ?, audience_type = ?, age_min = ?, age_max = ?, category_id = ?, status = 'published', updated_at = ?
      WHERE id = ?
    `).run(description, audienceType, ageMin, ageMax, categoryId, timestamp, contentId);
  }

  const existingEpisodes = db.prepare('SELECT COUNT(*) AS count FROM episodes WHERE content_id = ?').get(contentId).count;
  if (existingEpisodes === 0) {
    const insertEpisode = db.prepare(`
      INSERT INTO episodes
        (content_id, title, episode_no, raw_text, narration_script, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'ready_for_tts', ?, ?)
    `);

    episodes.forEach((episode, index) => {
      const narration = createNarrationScript(episode.text, audienceType);
      insertEpisode.run(contentId, episode.title, index + 1, episode.text, narration, timestamp, timestamp);
    });
  }
}

const demoContents = [
  {
    title: 'Ay Bahçesi',
    description: 'Uyku öncesi için yumuşak tempolu, kısa bir çocuk masalı.',
    audienceType: 'child',
    ageMin: 4,
    ageMax: 8,
    categoryName: 'Uyku Masalları',
    episodes: [
      {
        title: 'Pofuduk’un Daveti',
        text: 'Gece, küçük kasabanın üzerine yumuşacık bir battaniye gibi serilmişti. Arda yatağına uzanmış, pencereden görünen ayı izliyordu. Tam gözleri kapanacakken oyuncak ayısı Pofuduk hafifçe kıpırdadı ve kısık bir sesle konuştu: “Arda, bu gece Ay Bahçesi’ne gidiyoruz.”'
      },
      {
        title: 'Gümüş Kapı',
        text: 'Arda ve Pofuduk, odanın köşesinde parlayan küçük gümüş kapıya doğru yürüdüler. Kapı açıldığında içeriden lavanta kokusu ve çok uzaklardan gelen tatlı bir ninni duyuldu. Ay Bahçesi’nde yıldızlar ağaç dallarına asılmış minik lambalar gibiydi.'
      }
    ]
  },
  {
    title: 'Yağmurdan Sonra',
    description: 'Yetişkinler için sakin, edebi ve kısa bir akşam hikâyesi.',
    audienceType: 'adult',
    ageMin: 16,
    ageMax: null,
    categoryName: 'Kısa Hikâyeler',
    episodes: [
      {
        title: 'Boş Durak',
        text: 'Bazı akşamlar insan, eve dönerken yalnızca bir sokağı değil, kendi içinde yarım kalmış bir mevsimi de geçer. O akşam yağmur ince ince yağıyordu. Şehrin ışıkları kaldırım taşlarının üzerinde kırılıp çoğalıyor, herkes bir yere yetişiyor ama kimse gerçekten varmak istemiyor gibiydi.'
      }
    ]
  },
  {
    title: 'Ailece Yolculuk Hikâyeleri',
    description: 'Arabada veya evde birlikte dinlemek için kısa ve neşeli aile anlatıları.',
    audienceType: 'family',
    ageMin: 6,
    ageMax: null,
    categoryName: 'Sesli Tiyatro',
    episodes: [
      {
        title: 'Kayıp Harita',
        text: 'Eski bir piknik sepetinin içinden katlanmış bir harita çıktı. Haritanın üzerinde yalnızca üç şey yazıyordu: büyük çınar, mavi taş ve gülümseyen çeşme. Aile, bu küçük gizemin peşinden gitmeye karar verdi.'
      }
    ]
  }
];

for (const item of demoContents) {
  upsertContent(item);
}

console.log('Demo içerikler hazır. Admin panelden ses oluşturabilir veya mobil uygulamada listeleyebilirsin.');
