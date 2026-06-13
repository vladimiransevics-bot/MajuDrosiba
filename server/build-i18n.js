// Prerender RU/EN static copies of the LV source pages so search engines can
// index each language at its own URL (/ru/..., /en/...). LV stays at the root.
// Single source of truth = the Latvian HTML + lang/*.json. Run at server start.
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const PUBLIC = path.join(__dirname, '../public');
const BASE = process.env.SITE_ORIGIN || 'https://majudrosiba.onrender.com';
const LANGS = ['ru', 'en'];
const OG_LOCALE = { lv: 'lv_LV', ru: 'ru_RU', en: 'en_US' };

// Root-relative pages that make up the site (used for link rewriting + generation)
const PAGES = [
  'index.html',
  'services/video.html', 'services/access-control.html', 'services/locks.html',
  'services/safes.html', 'services/fire-alarm.html', 'services/metal-doors.html',
  'shop.html', 'cart.html', 'cctv-designer.html', 'privacy.html', 'terms.html',
];
const PAGE_SET = new Set(PAGES);

// Per-page SEO title/description translation keys (looked up in lang/<lang>.json)
const PAGE_SEO = {
  'index.html':                    { title: 'seo_home_title',   desc: 'seo_home_desc' },
  'services/video.html':           { title: 'seo_video_title',  desc: 'seo_video_desc' },
  'services/access-control.html':  { title: 'seo_access_title', desc: 'seo_access_desc' },
  'services/locks.html':           { title: 'seo_locks_title',  desc: 'seo_locks_desc' },
  'services/safes.html':           { title: 'seo_safes_title',  desc: 'seo_safes_desc' },
  'services/fire-alarm.html':      { title: 'seo_fire_title',   desc: 'seo_fire_desc' },
  'services/metal-doors.html':     { title: 'seo_doors_title',  desc: 'seo_doors_desc' },
  'cctv-designer.html':            { title: 'seo_cctv_title',   desc: 'seo_cctv_desc' },
};

const langPath = (lang, p) =>
  lang === 'lv'
    ? (p === 'index.html' ? `${BASE}/` : `${BASE}/${p}`)
    : (p === 'index.html' ? `${BASE}/${lang}/` : `${BASE}/${lang}/${p}`);

function rewriteRef(val, pageDir, lang) {
  if (!val) return val;
  if (/^(https?:|\/\/|#|tel:|mailto:|data:|javascript:)/i.test(val)) return val;
  const m = val.match(/^([^?#]*)([?#].*)?$/);
  let pathPart = m[1];
  const rest = m[2] || '';
  if (!pathPart) return val;
  const abs = pathPart.startsWith('/')
    ? pathPart.replace(/^\/+/, '')
    : path.posix.normalize(path.posix.join(pageDir, pathPart));
  return PAGE_SET.has(abs) ? `/${lang}/${abs}${rest}` : `/${abs}${rest}`;
}

function buildPage(pagePath, lang, dict) {
  const src = fs.readFileSync(path.join(PUBLIC, pagePath), 'utf8');
  const $ = cheerio.load(src, { decodeEntities: false });
  const pageDir = path.posix.dirname(pagePath); // 'services' or '.'

  // 1) Apply translations
  $('[data-i18n]').each((_, el) => {
    const v = dict[$(el).attr('data-i18n')];
    if (v !== undefined) $(el).html(v);
  });
  $('[data-i18n-placeholder]').each((_, el) => {
    const v = dict[$(el).attr('data-i18n-placeholder')];
    if (v !== undefined) $(el).attr('placeholder', v);
  });
  $('[data-i18n-value]').each((_, el) => {
    const v = dict[$(el).attr('data-i18n-value')];
    if (v !== undefined) $(el).attr('value', v);
  });
  $('[data-i18n-title]').each((_, el) => {
    const v = dict[$(el).attr('data-i18n-title')];
    if (v !== undefined) $(el).attr('title', v);
  });

  // 2) <html lang> + translated <title>/<meta description> + matching og/twitter
  $('html').attr('lang', lang);
  const seo = PAGE_SEO[pagePath];
  if (seo) {
    const t = dict[seo.title], d = dict[seo.desc];
    if (t) {
      $('title').text(t);
      $('meta[property="og:title"]').attr('content', t);
      $('meta[name="twitter:title"]').attr('content', t);
    }
    if (d) {
      $('meta[name="description"]').attr('content', d);
      $('meta[property="og:description"]').attr('content', d);
      $('meta[name="twitter:description"]').attr('content', d);
    }
  }

  // 3) Rewrite asset/page links: assets → absolute root, site pages → /lang/...
  $('[src]').each((_, el) => $(el).attr('src', rewriteRef($(el).attr('src'), pageDir, lang)));
  $('[href]').each((_, el) => {
    const rel = $(el).attr('rel') || '';
    if (rel.includes('canonical') || rel.includes('alternate')) return; // set below
    $(el).attr('href', rewriteRef($(el).attr('href'), pageDir, lang));
  });
  // inline style="... url('../uploads/..') .."
  $('[style*="url("]').each((_, el) => {
    const s = $(el).attr('style').replace(
      /url\((['"]?)([^'")]+)\1\)/g,
      (mm, q, u) => `url(${q}${rewriteRef(u, pageDir, lang)}${q})`
    );
    $(el).attr('style', s);
  });

  // 4) canonical + og:url + og:locale + hreflang
  const self = langPath(lang, pagePath);
  $('link[rel="canonical"]').attr('href', self);
  $('meta[property="og:url"]').attr('content', self);
  if ($('meta[property="og:locale"]').length) $('meta[property="og:locale"]').attr('content', OG_LOCALE[lang]);
  else $('head').append(`\n  <meta property="og:locale" content="${OG_LOCALE[lang]}">`);

  $('link[rel="alternate"][hreflang]').remove();
  const alts = [
    `<link rel="alternate" hreflang="lv" href="${langPath('lv', pagePath)}">`,
    `<link rel="alternate" hreflang="ru" href="${langPath('ru', pagePath)}">`,
    `<link rel="alternate" hreflang="en" href="${langPath('en', pagePath)}">`,
    `<link rel="alternate" hreflang="x-default" href="${langPath('lv', pagePath)}">`,
  ].join('\n  ');
  $('link[rel="canonical"]').after('\n  ' + alts);

  const outPath = path.join(PUBLIC, lang, pagePath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, $.html());
}

function build() {
  let n = 0;
  for (const lang of LANGS) {
    const dictFile = path.join(PUBLIC, 'lang', `${lang}.json`);
    const dict = JSON.parse(fs.readFileSync(dictFile, 'utf8'));
    for (const p of PAGES) {
      buildPage(p, lang, dict);
      n++;
    }
  }
  return n;
}

module.exports = { build, PAGES, langPath, BASE };

// CLI: `node server/build-i18n.js`
if (require.main === module) {
  const n = build();
  console.log(`[i18n] generated ${n} localized pages (${LANGS.join(', ')})`);
}
