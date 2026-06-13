const crypto = require('crypto');

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// HTTP Basic Auth gate for the admin panel and write APIs.
// Credentials come from env: ADMIN_USER (default "admin") + ADMIN_PASSWORD.
// Fails closed — if ADMIN_PASSWORD is not set, access is denied, never open.
function requireAuth(req, res, next) {
  const USER = process.env.ADMIN_USER || 'admin';
  const PASS = process.env.ADMIN_PASSWORD;

  if (!PASS) {
    console.warn('[auth] ADMIN_PASSWORD is not set — admin access denied. Set it in env to enable.');
    res.set('WWW-Authenticate', 'Basic realm="MajuDrosiba Admin", charset="UTF-8"');
    return res.status(503).json({ error: 'Admin access is not configured' });
  }

  const [scheme, encoded] = (req.headers.authorization || '').split(' ');
  if (scheme === 'Basic' && encoded) {
    const [user, pass] = Buffer.from(encoded, 'base64').toString('utf8').split(':');
    if (user && pass && safeEqual(user, USER) && safeEqual(pass, PASS)) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="MajuDrosiba Admin", charset="UTF-8"');
  return res.status(401).json({ error: 'Authentication required' });
}

module.exports = { requireAuth };
