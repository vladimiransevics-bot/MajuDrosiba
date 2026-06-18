require('dotenv').config(); // load .env before anything else
require('./database'); // init DB on startup
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('./auth');

// Prerender RU/EN localized pages from the LV source on startup.
// Single source of truth = LV HTML + lang/*.json; generated copies are not committed.
try {
  const n = require('./build-i18n').build();
  console.log(`[i18n] generated ${n} localized pages`);
} catch (e) {
  console.error('[i18n] prerender failed (LV still served):', e.message);
}

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1); // behind Render's proxy — needed for correct client IP

// ── gzip / brotli compression on all responses ──
app.use(compression());

// ── Security headers ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.googletagmanager.com"],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers (onclick etc. used in admin + cart)
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      workerSrc: ["'self'", "blob:", "https://cdnjs.cloudflare.com"],
      connectSrc: ["'self'", "https://www.googletagmanager.com", "https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googleadservices.com", "https://*.g.doubleclick.net", "https://www.google.com"],
      objectSrc: ["'none'"],
      frameSrc: ["https://www.google.com", "https://maps.google.com", "https://maps.googleapis.com", "https://td.doubleclick.net"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // allow external fonts/CDN without COEP friction
}));

app.use(express.json({ limit: '12mb' })); // base64 image uploads from admin

// ── Rate limiters ──
const formLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 8,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// ── Admin login endpoint (public — issues a token) ──
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const { validateCredentials, createToken } = require('./auth');
  if (validateCredentials(username, password)) {
    res.json({ token: createToken() });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// ── Admin panel: gate BEFORE static so the HTML is never served unauthenticated ──
app.use('/admin', requireAuth);

app.use(express.static(path.join(__dirname, '../public'), {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate'); // always revalidate HTML
    } else if (ext === '.css' || ext === '.js') {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1h — no hash-versioning yet
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.avif'].includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7d
    } else if (['.woff', '.woff2', '.ttf', '.otf'].includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable'); // 30d
    } else if (ext === '.xml' || ext === '.txt') {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // sitemap/robots: 1h
    }
  },
}));

// ── Public form endpoints (no auth, rate-limited) ──
app.use('/api/contact', formLimiter, require('./routes/contact'));

// ── Read public, writes admin-only ──
const writeAuth = (req, res, next) =>
  req.method === 'GET' ? next() : requireAuth(req, res, next);

app.use('/api/products',   writeAuth, require('./routes/products'));
app.use('/api/categories', writeAuth, require('./routes/categories'));
app.use('/api/carousel',   writeAuth, require('./routes/carousel'));

// ── Orders: POST is public checkout (rate-limited); GET/PUT expose data → admin ──
app.use('/api/orders',
  (req, res, next) =>
    req.method === 'POST' ? formLimiter(req, res, next) : requireAuth(req, res, next),
  require('./routes/orders'));

// ── Admin-only tools ──
app.use('/api/upload',    requireAuth, require('./routes/upload'));
app.use('/api/translate', requireAuth, require('./routes/translate'));

// ── Google Merchant Center product feed (public, read-only) ──
app.use('/feed.xml', require('./routes/feed'));

// Return 404 for unmatched API routes instead of serving HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// SPA fallback for service pages
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => console.log(`MAJUDROSIBA server running on port ${PORT}`));
