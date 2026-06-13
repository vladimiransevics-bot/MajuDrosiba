const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '../../public/uploads/products');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

router.post('/', (req, res) => {
  try {
    const { filename, data } = req.body || {};
    if (!data) return res.status(400).json({ error: 'No file data' });

    let ext = (path.extname(filename || '') || '').toLowerCase();
    if (!ALLOWED.has(ext)) ext = '.jpg';

    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, safeName), Buffer.from(data, 'base64'));

    res.json({ url: `/uploads/products/${safeName}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
