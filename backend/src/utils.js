const path = require('path');
const fs = require('fs');

function ensureUploadFolders() {
  const root = process.env.UPLOAD_ROOT || './uploads';
  for (const folder of ['pdf', 'audio', 'covers']) {
    fs.mkdirSync(path.resolve(process.cwd(), root, folder), { recursive: true });
  }
}

function safeInt(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function publicUploadUrl(folder, filename) {
  return `/uploads/${folder}/${filename}`;
}

module.exports = { ensureUploadFolders, safeInt, safeBool, publicUploadUrl };
