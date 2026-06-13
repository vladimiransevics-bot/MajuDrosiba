const https = require('https');
const express = require('express');
const router = express.Router();

// MyMemory accepts ~500 chars per request reliably; chunk longer text.
const CHUNK = 480;

function callMyMemory(text, fromLang, toLang) {
  return new Promise((resolve, reject) => {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
    https.get(url, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', c => buf += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(buf);
          if (j.responseStatus !== 200 && j.responseStatus !== '200') {
            return reject(new Error(j.responseDetails || 'translation failed'));
          }
          resolve(j.responseData && j.responseData.translatedText || text);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function translateChunked(text, fromLang, toLang) {
  if (text.length <= CHUNK) return callMyMemory(text, fromLang, toLang);
  // Split on sentence boundaries / whitespace
  const parts = text.match(new RegExp(`[\\s\\S]{1,${CHUNK}}(?=\\s|$)`, 'g')) || [text];
  const out = [];
  for (const p of parts) out.push(await callMyMemory(p, fromLang, toLang));
  return out.join(' ');
}

router.post('/', async (req, res) => {
  const { text, from, to } = req.body || {};
  if (!text || !text.trim()) return res.json({ translated: '' });
  if (!from || !to)         return res.status(400).json({ error: 'Missing from/to' });
  if (from === to)          return res.json({ translated: text });

  try {
    const translated = await translateChunked(text, from, to);
    res.json({ translated });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

module.exports = router;
