// Google Merchant Center product feed (RSS 2.0 + g: namespace) for Shopping ads.
// Served at /feed.xml. Optional ?lang=ru|en switches title/description/landing language (default lv).
const express = require('express');
const db = require('../database');
const router = express.Router();

const BASE = process.env.SITE_ORIGIN || 'https://majudrosiba.lv';
const VAT_RATE = 0.21; // DB stores prices EXCLUDING VAT; Merchant Center (EU) requires tax-inclusive

// DB fields (imported from HTML sources) may already hold entities like &amp;.
// Decode to plain text first, then XML-escape once — otherwise we double-encode.
function decodeEntities(s) {
  return String(s == null ? '' : s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
function xml(s) {
  return decodeEntities(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function stripHtml(s) {
  return String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
function absUrl(u) {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return BASE + (u.charAt(0) === '/' ? '' : '/') + u;
}

router.get('/', (req, res) => {
  const lang = ['ru', 'en'].includes(req.query.lang) ? req.query.lang : 'lv';
  const rows = db.prepare('SELECT * FROM products ORDER BY id').all();

  const items = rows.map((p) => {
    const img = absUrl(decodeEntities(p.image_url));
    const title = p['name_' + lang] || p.name_lv;
    const desc = stripHtml(p['desc_' + lang] || p.desc_lv) || title;
    const price = (p.price * (1 + VAT_RATE)).toFixed(2);
    const availability = p.in_stock ? 'in_stock' : 'preorder';
    const link = BASE + '/' + (lang === 'lv' ? '' : lang + '/') + 'shop.html?product=' + p.id;
    const lines = [
      '    <item>',
      '      <g:id>' + xml(p.sku || ('MD-' + p.id)) + '</g:id>',
      '      <title>' + xml(title) + '</title>',
      '      <description>' + xml(desc) + '</description>',
      '      <link>' + xml(link) + '</link>',
    ];
    // image_link only when a photo exists — Google requires it, so items without one
    // stay disapproved until a photo is added (omitting the empty tag keeps the XML clean).
    if (img) lines.push('      <g:image_link>' + xml(img) + '</g:image_link>');
    lines.push(
      '      <g:price>' + price + ' EUR</g:price>',
      '      <g:availability>' + availability + '</g:availability>',
      '      <g:condition>new</g:condition>',
      '      <g:identifier_exists>no</g:identifier_exists>',
      '    </item>'
    );
    return lines.join('\n');
  }).join('\n');

  const feed =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n' +
    '  <channel>\n' +
    '    <title>' + xml('MĀJU DROŠĪBA') + '</title>\n' +
    '    <link>' + BASE + '/</link>\n' +
    '    <description>' + xml('Drošības produktu veikals') + '</description>\n' +
    items + '\n' +
    '  </channel>\n' +
    '</rss>\n';

  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.send(feed);
});

module.exports = router;
