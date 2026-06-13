require('./database'); // init DB on startup
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1); // behind Render's proxy — needed for correct client IP

// ── Security headers ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      workerSrc: ["'self'", "blob:", "https://cdnjs.cloudflare.com"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
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

// ── Admin panel: gate BEFORE static so the HTML is never served unauthenticated ──
app.use('/admin', requireAuth);

app.use(express.static(path.join(__dirname, '../public')));

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

// SPA fallback for service pages
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => console.log(`MAJUDROSIBA server running on port ${PORT}`));
