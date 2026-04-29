const crypto = require('crypto');
const { db, nowIso } = require('./db');

const TOKEN_TTL_HOURS = Number(process.env.ADMIN_TOKEN_TTL_HOURS || 12);
const TOKEN_SECRET = process.env.ADMIN_JWT_SECRET || 'sesli-sahne-local-dev-secret-change-me';
const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '0000';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const iterations = 120000;
  const digest = 'sha256';
  const hash = crypto.pbkdf2Sync(String(password), salt, iterations, 32, digest).toString('hex');
  return `pbkdf2$${iterations}$${digest}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !String(storedHash).startsWith('pbkdf2$')) return false;
  const [scheme, iterStr, digest, salt, expected] = String(storedHash).split('$');
  if (scheme !== 'pbkdf2' || !iterStr || !digest || !salt || !expected) return false;
  const actual = crypto.pbkdf2Sync(String(password), salt, Number(iterStr), Buffer.from(expected, 'hex').length, digest).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signPayload(payloadObject) {
  const payload = base64url(JSON.stringify(payloadObject));
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  if (Buffer.from(signature).length !== Buffer.from(expected).length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!data.exp || Date.now() > data.exp) return null;
  return data;
}

function createToken(user) {
  return signPayload({
    sub: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000
  });
}

function ensureDefaultAdmin() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM admin_users').get().count;
  if (count > 0) return;
  const timestamp = nowIso();
  db.prepare(`
    INSERT INTO admin_users (username, password_hash, role, created_at, updated_at)
    VALUES (?, ?, 'admin', ?, ?)
  `).run(DEFAULT_ADMIN_USERNAME, hashPassword(DEFAULT_ADMIN_PASSWORD), timestamp, timestamp);
  console.log(`[AUTH] İlk admin kullanıcı hazır: ${DEFAULT_ADMIN_USERNAME} / ${DEFAULT_ADMIN_PASSWORD} (local geliştirme için; sonra değiştirin)`);
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

function getAuthenticatedAdmin(req) {
  const token = getBearerToken(req);
  const data = verifyToken(token);
  if (!data?.sub) return null;
  const user = db.prepare('SELECT id, username, role, created_at, updated_at FROM admin_users WHERE id = ?').get(data.sub);
  return user || null;
}

function requireAdminAuth(req, res, next) {
  if (process.env.ADMIN_AUTH_ENABLED === 'false') return next();
  const user = getAuthenticatedAdmin(req);
  if (!user) return res.status(401).json({ error: 'Admin oturumu gerekli. Lütfen yayıncı paneline giriş yapın.' });
  req.adminUser = user;
  next();
}

function adminWriteGuard(req, res, next) {
  if (process.env.ADMIN_AUTH_ENABLED === 'false') return next();
  if (req.method === 'OPTIONS') return next();
  const path = req.path || '';
  const method = req.method.toUpperCase();

  const protectedAll = ['/imports', '/media', '/studio', '/tts'];
  if (protectedAll.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return requireAdminAuth(req, res, next);
  }

  if ((path === '/categories' || path.startsWith('/categories/')) && method !== 'GET') {
    return requireAdminAuth(req, res, next);
  }

  if ((path === '/contents' || path.startsWith('/contents/')) && method !== 'GET') {
    return requireAdminAuth(req, res, next);
  }

  if ((path === '/episodes' || path.startsWith('/episodes/')) && method !== 'GET') {
    return requireAdminAuth(req, res, next);
  }

  return next();
}

module.exports = {
  ensureDefaultAdmin,
  hashPassword,
  verifyPassword,
  createToken,
  getAuthenticatedAdmin,
  requireAdminAuth,
  adminWriteGuard
};
