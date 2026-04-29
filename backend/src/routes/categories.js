const express = require('express');
const { db, nowIso, slugify } = require('../db');
const { safeInt } = require('../utils');

const router = express.Router();

router.get('/', (req, res) => {
  const categories = db.prepare(`
    SELECT cat.*, COUNT(c.id) AS content_count
    FROM categories cat
    LEFT JOIN contents c ON c.category_id = cat.id
    GROUP BY cat.id
    ORDER BY cat.name ASC
  `).all();
  res.json({ data: categories });
});

router.post('/', (req, res) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();

  if (!name) return res.status(400).json({ error: 'Kategori adı zorunludur.' });

  const slugBase = slugify(name);
  let slug = slugBase;
  let counter = 2;
  while (db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug)) {
    slug = `${slugBase}-${counter}`;
    counter += 1;
  }

  const result = db.prepare(`
    INSERT INTO categories (name, slug, description, created_at)
    VALUES (?, ?, ?, ?)
  `).run(name, slug, description, nowIso());

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ data: category });
});

router.patch('/:id', (req, res) => {
  const id = safeInt(req.params.id);
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Kategori bulunamadı.' });

  const name = req.body.name !== undefined ? String(req.body.name || '').trim() : existing.name;
  const description = req.body.description !== undefined ? String(req.body.description || '').trim() : existing.description;

  if (!name) return res.status(400).json({ error: 'Kategori adı zorunludur.' });

  const duplicate = db.prepare('SELECT id FROM categories WHERE name = ? AND id != ?').get(name, id);
  if (duplicate) return res.status(400).json({ error: 'Bu isimde başka bir kategori var.' });

  const slugBase = slugify(name);
  let slug = slugBase;
  let counter = 2;
  while (db.prepare('SELECT id FROM categories WHERE slug = ? AND id != ?').get(slug, id)) {
    slug = `${slugBase}-${counter}`;
    counter += 1;
  }

  db.prepare('UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?').run(name, slug, description, id);
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  res.json({ data: category });
});

router.delete('/:id', (req, res) => {
  const id = safeInt(req.params.id);
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Kategori bulunamadı.' });

  const contentCount = db.prepare('SELECT COUNT(*) AS count FROM contents WHERE category_id = ?').get(id).count;

  const transaction = db.transaction(() => {
    db.prepare('UPDATE contents SET category_id = NULL, updated_at = ? WHERE category_id = ?').run(nowIso(), id);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  });
  transaction();

  res.json({ ok: true, detached_content_count: contentCount });
});

module.exports = router;
