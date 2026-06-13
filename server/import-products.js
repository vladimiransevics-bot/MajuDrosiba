/**
 * One-off product import script.
 * Run: node import-products.js
 * Scrapes og:title, og:description, og:image and tries to find a price.
 * Sets all three language name/desc fields to the same scraped value.
 * Admin can edit individual fields afterwards.
 */
const https = require('https');
const http = require('http');
const db = require('./database');

const IMPORT_LIST = [
  // ── Video Surveillance ─────────────────────────────────────────────────
  { url: 'https://www.loks.lv/lv/product/9800',  category: 'video' },
  { url: 'https://www.loks.lv/lv/product/10580', category: 'video' },
  { url: 'https://www.loks.lv/lv/product/11065', category: 'video' },
  { url: 'https://www.loks.lv/lv/product/10712', category: 'video' },
  { url: 'https://www.loks.lv/lv/product/9801',  category: 'video' },
  { url: 'https://www.loks.lv/lv/product/10587', category: 'video' },
  { url: 'https://www.loks.lv/lv/product/11066', category: 'video' },
  { url: 'https://www.loks.lv/lv/product/10568', category: 'video' },
  { url: 'https://www.loks.lv/lv/product/5891',  category: 'video' },
  { url: 'https://www.loks.lv/lv/product/9480',  category: 'video' },
  { url: 'https://www.loks.lv/lv/product/9900',  category: 'video' },
  { url: 'https://www.loks.lv/lv/product/10617', category: 'video' },
  { url: 'https://www.ezviz.com/product/h9c+dual+3k/56091', category: 'video' },
  { url: 'https://www.ezviz.com/product/h8+pro+3k/43242',   category: 'video' },
  { url: 'https://www.ezviz.com/product/el3/47930',          category: 'video' },

  // ── Smart Locks ────────────────────────────────────────────────────────
  { url: 'https://tedee.com/product/tedee-keypad-pro-black/',                    category: 'locks' },
  { url: 'https://tedee.com/product/tedee-go2-cylinder-full-bundle/',            category: 'locks' },
  { url: 'https://tedee.com/product/tedee-go2-cylinder-bridge-bundle/',          category: 'locks' },
  { url: 'https://tedee.com/product/tedee-pro-door-sensor-cylinder-bridge-bundle/', category: 'locks' },

  // ── Locks (mechanical) ─────────────────────────────────────────────────
  { url: 'https://sledzenes.lv/rokturis-uz-plaksnes-cilindram-brunots-72mm-bronza',    category: 'locks' },
  { url: 'https://sledzenes.lv/rokturis-uz-plaksnes-cilindram-85mm-sudrabs',           category: 'locks' },
  { url: 'https://sledzenes.lv/sledzene-mottura-89-723-ar-5-atslegam',                 category: 'locks' },
  { url: 'https://sledzenes.lv/sledzene-ar-uzliku-pol-hroms-ar-5-atslegam-1',          category: 'locks' },
  { url: 'https://sledzenes.lv/sledzene-ar-5-atslegam-hroms-1',                        category: 'locks' },
  { url: 'https://sledzenes.lv/sledzene-ar-5-atslegam-hroms-3',                        category: 'locks' },
  { url: 'https://sledzenes.lv/mottura-dp2517',                                         category: 'locks' },
  { url: 'https://sledzenes.lv/sledzene-ar-5-atslegam-hroms-4',                        category: 'locks' },
  { url: 'https://sledzenes.lv/sledzene-ar-uzliku-pol-hroms-ar-5-atslegam',            category: 'locks' },
  { url: 'https://sledzenes.lv/sledzene-ar-uzliku-satin-hroms-ar-5-atslegam',          category: 'locks' },

  // ── Safes ──────────────────────────────────────────────────────────────
  { url: 'https://yalehome.co.uk/smart-safe-medium/', category: 'safes' },

  // ── Access Control ─────────────────────────────────────────────────────
  { url: 'https://bklatvia.lv/karsu-lasitajs-ds-k1107am-mifare-kartes-302918662.html',    category: 'access-control' },
  { url: 'https://bklatvia.lv/karsu-lasitajs-ds-k1107amk-ar-tastaturu-mifare-kartes-302918666.html', category: 'access-control' },
  { url: 'https://bklatvia.lv/piekluves-kontrolieris-ds-k2604t-4-durvju-ar-kasti-302913800.html',    category: 'access-control' },
  { url: 'http://bklatvia.lv/piekluves-kontrolieris-ds-k2804-4-durvju-302901273.html',    category: 'access-control' },
  { url: 'https://www.ezviz.com/product/dp2+2k/47961', category: 'access-control' },
  { url: 'https://www.ezviz.com/product/hp7/46757',    category: 'access-control' },
];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'lv,en;q=0.9',
      }
    };
    const req = lib.get(url, options, (res) => {
      // follow up to 3 redirects
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) && res.headers.location) {
        const loc = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
        resolve(fetchPage(loc));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function extractMeta(html, prop) {
  // try property="og:xxx" and name="og:xxx"
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${prop}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1].trim();
  }
  return '';
}

function extractPrice(html) {
  // itemprop="price"
  const m1 = html.match(/itemprop=["']price["'][^>]+content=["']([0-9]+\.?[0-9]*)["']/i)
           || html.match(/content=["']([0-9]+\.?[0-9]*)["'][^>]+itemprop=["']price["']/i);
  if (m1) return parseFloat(m1[1]);

  // common price class patterns
  const m2 = html.match(/class=["'][^"']*price[^"']*["'][^>]*>\s*[€$]?\s*([0-9]+[.,]?[0-9]*)\s*[€]?/i);
  if (m2) return parseFloat(m2[1].replace(',', '.'));

  return 0;
}

function decode(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

const insert = db.prepare(
  'INSERT INTO products (category_id, name_lv, name_ru, name_en, desc_lv, desc_ru, desc_en, price, image_url) VALUES (?,?,?,?,?,?,?,?,?)'
);

async function importAll() {
  let ok = 0, fail = 0;

  for (const { url, category } of IMPORT_LIST) {
    try {
      process.stdout.write(`  Fetching ${url} ... `);
      const html = await fetchPage(url);

      const name  = decode(extractMeta(html, 'og:title'))       || decode(extractMeta(html, 'title')) || url;
      const desc  = decode(extractMeta(html, 'og:description'))  || '';
      const image = extractMeta(html, 'og:image') || '';
      const price = extractPrice(html);

      insert.run(category, name, name, name, desc, desc, desc, price, image);
      console.log(`OK  (${name.slice(0, 50)})`);
      ok++;
    } catch (e) {
      console.log(`FAIL  (${e.message})`);
      fail++;
    }

    // polite delay
    await new Promise(r => setTimeout(r, 600));
  }

  console.log(`\nDone. Imported: ${ok}, Failed: ${fail}`);
}

importAll();
