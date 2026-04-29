const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const databasePath = process.env.DATABASE_PATH || './data/sesli-sahne.sqlite';
const resolvedDatabasePath = path.resolve(process.cwd(), databasePath);
fs.mkdirSync(path.dirname(resolvedDatabasePath), { recursive: true });

const db = new Database(resolvedDatabasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function nowIso() {
  return new Date().toISOString();
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      audience_type TEXT NOT NULL CHECK (audience_type IN ('child', 'adult', 'family')),
      age_min INTEGER,
      age_max INTEGER,
      category_id INTEGER,
      cover_image_url TEXT,
      is_premium INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'pdf', 'audio')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      episode_no INTEGER NOT NULL DEFAULT 1,
      raw_text TEXT DEFAULT '',
      narration_script TEXT DEFAULT '',
      audio_url TEXT,
      duration_seconds INTEGER,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready_for_tts', 'audio_generated', 'published', 'archived', 'tts_failed')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pdf_imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER,
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      page_count INTEGER,
      char_count INTEGER,
      status TEXT NOT NULL DEFAULT 'imported' CHECK (status IN ('imported', 'failed')),
      error_message TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tts_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      episode_id INTEGER NOT NULL,
      provider TEXT NOT NULL DEFAULT 'openai',
      model TEXT,
      voice TEXT,
      status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
      audio_url TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES user_accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      audience_type TEXT NOT NULL CHECK (audience_type IN ('child', 'adult', 'family')),
      age_min INTEGER,
      age_max INTEGER,
      avatar_emoji TEXT DEFAULT '🎧',
      pin_code TEXT,
      pin_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES user_accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS listening_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER,
      episode_id INTEGER NOT NULL,
      progress_seconds INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER,
      content_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'publisher', 'editor')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const profileColumns = db.prepare('PRAGMA table_info(profiles)').all().map((row) => row.name);
  if (!profileColumns.includes('user_id')) {
    db.prepare('ALTER TABLE profiles ADD COLUMN user_id INTEGER').run();
  }
}

function hashLocalPassword(password) {
  const crypto = require('crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 120000;
  const digest = 'sha256';
  const hash = crypto.pbkdf2Sync(String(password), salt, iterations, 32, digest).toString('hex');
  return `pbkdf2$${iterations}$${digest}$${salt}$${hash}`;
}

function ensureDefaultUser() {
  const timestamp = nowIso();
  let user = db.prepare('SELECT * FROM user_accounts WHERE email = ?').get('demo@seslisahne.local');
  if (!user) {
    const result = db.prepare(`
      INSERT INTO user_accounts (email, name, password_hash, status, created_at, updated_at)
      VALUES (?, ?, ?, 'active', ?, ?)
    `).run('demo@seslisahne.local', 'Demo Kullanıcı', hashLocalPassword('0000'), timestamp, timestamp);
    user = db.prepare('SELECT * FROM user_accounts WHERE id = ?').get(result.lastInsertRowid);
  }
  db.prepare('UPDATE profiles SET user_id = ? WHERE user_id IS NULL').run(user.id);
  return user;
}

function slugify(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `kategori-${Date.now()}`;
}

function seedBaseData() {
  const count = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (count > 0) return;

  const categories = [
    ['Uyku Masalları', 'Uyku öncesi sakin ve yavaş tempolu anlatılar'],
    ['Sesli Tiyatro', 'Karakterli, efektli ve dramatize hikâyeler'],
    ['Eğitici Hikâyeler', 'Çocuklar için yaşa uygun öğretici içerikler'],
    ['Kısa Hikâyeler', 'Yetişkinler için kısa edebi anlatılar'],
    ['Rahatlama', 'Yetişkinler için sakinleşme ve gevşeme anlatıları']
  ];

  const insert = db.prepare('INSERT INTO categories (name, slug, description, created_at) VALUES (?, ?, ?, ?)');
  const insertMany = db.transaction((items) => {
    for (const [name, description] of items) {
      insert.run(name, slugify(name), description, nowIso());
    }
  });
  insertMany(categories);
}

function seedDefaultProfiles(defaultUserId = 1) {
  const count = db.prepare('SELECT COUNT(*) as count FROM profiles').get().count;
  if (count > 0) return;

  const timestamp = nowIso();
  const insert = db.prepare(`
    INSERT INTO profiles (user_id, name, audience_type, age_min, age_max, avatar_emoji, pin_code, pin_enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const items = [
    ['Minik Dinleyici', 'child', 3, 8, '🧸', null, 0],
    ['Yetişkin', 'adult', null, null, '🎧', '0000', 1],
    ['Aile', 'family', null, null, '🏡', '0000', 1]
  ];

  const insertMany = db.transaction((profiles) => {
    for (const item of profiles) insert.run(defaultUserId, ...item, timestamp, timestamp);
  });
  insertMany(items);
}

migrate();
const defaultUser = ensureDefaultUser();
seedBaseData();
seedDefaultProfiles(defaultUser.id);

module.exports = { db, nowIso, slugify };
