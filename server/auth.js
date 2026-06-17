const crypto = require('crypto');

const sessions = new Set();
const COOKIE = 'maj_sess';
const TTL = 8 * 60 * 60 * 1000; // 8 hours

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function parseCookie(req, name) {
  const header = req.headers.cookie || '';
  const pair = header.split(';').find(c => c.trim().startsWith(name + '='));
  return pair ? pair.split('=').slice(1).join('=').trim() : null;
}

function createToken() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.add(token);
  setTimeout(() => sessions.delete(token), TTL);
  return token;
}

function validateCredentials(user, pass) {
  const USER = process.env.ADMIN_USER || 'admin';
  const PASS = process.env.ADMIN_PASSWORD;
  if (!PASS) return false;
  return safeEqual(String(user || ''), USER) && safeEqual(String(pass || ''), PASS);
}

function requireAuth(req, res, next) {
  const PASS = process.env.ADMIN_PASSWORD;

  if (!PASS) {
    res.set('WWW-Authenticate', 'Basic realm="MajuDrosiba Admin", charset="UTF-8"');
    return res.status(503).json({ error: 'Admin access is not configured' });
  }

  // 1. Session cookie (set after Basic Auth page load)
  const cookie = parseCookie(req, COOKIE);
  if (cookie && sessions.has(cookie)) return next();

  // 2. Bearer token (sent by admin panel JS)
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7);
    if (sessions.has(token)) return next();
  }

  // 3. Basic Auth header (browser dialog for /admin/ page load)
  if (auth.startsWith('Basic ')) {
    const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
    const colon = decoded.indexOf(':');
    if (colon > 0) {
      const user = decoded.slice(0, colon);
      const pass = decoded.slice(colon + 1);
      if (validateCredentials(user, pass)) {
        const token = createToken();
        const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
        res.setHeader('Set-Cookie',
          `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Max-Age=${TTL / 1000}; Path=/${secure}`);
        return next();
      }
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="MajuDrosiba Admin", charset="UTF-8"');
  return res.status(401).json({ error: 'Authentication required' });
}

module.exports = { requireAuth, validateCredentials, createToken };
