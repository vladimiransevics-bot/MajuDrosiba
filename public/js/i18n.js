const LANGS = ['lv', 'ru', 'en'];
const DEFAULT_LANG = 'lv';
let translations = {};

// Language is determined by the URL: /ru/... → ru, /en/... → en, otherwise lv.
// Each language is a prerendered set of pages (see server/build-i18n.js), so the
// switcher navigates between language URLs instead of swapping text in place.
function pathInfo() {
  const m = location.pathname.match(/^\/(ru|en)(\/.*)?$/);
  if (m) return { lang: m[1], rest: m[2] || '/' };
  return { lang: DEFAULT_LANG, rest: location.pathname };
}

function getLang() {
  return pathInfo().lang;
}

function urlForLang(lang) {
  const { rest } = pathInfo();
  const prefix = lang === DEFAULT_LANG ? '' : '/' + lang;
  return (prefix + rest || '/') + location.search + location.hash;
}

// Derive deploy-root from this script's own URL — works on any subpath.
const I18N_BASE = (function() {
  const tag = document.currentScript
    || [...document.getElementsByTagName('script')].find(s => /\/js\/i18n\.js(?:\?|$)/.test(s.src));
  return tag ? tag.src.replace(/\/js\/i18n\.js.*$/, '/') : '/';
})();

async function loadLang(lang) {
  const res = await fetch(`${I18N_BASE}lang/${lang}.json?v=16`);
  translations = await res.json();
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[key] !== undefined) el.innerHTML = translations[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[key] !== undefined) el.placeholder = translations[key];
  });
  document.querySelectorAll('[data-i18n-value]').forEach(el => {
    const key = el.getAttribute('data-i18n-value');
    if (translations[key] !== undefined) el.value = translations[key];
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (translations[key] !== undefined) el.title = translations[key];
  });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === getLang());
  });
  document.documentElement.lang = getLang();
}

// Switching language = navigating to that language's URL for the current page.
function setLanguage(lang) {
  if (!LANGS.includes(lang) || lang === getLang()) return;
  location.href = urlForLang(lang);
}

window.i18n = key => translations[key] !== undefined ? translations[key] : key;

async function initI18n() {
  const lang = getLang();
  // Keep localStorage in sync with the URL language — shop/cart/carousel read it
  // to pick which language field of a product to display.
  try { localStorage.setItem('lang', lang); } catch (e) {}
  try {
    await loadLang(lang);
    applyTranslations();
    document.dispatchEvent(new Event('langChanged'));
  } catch(e) {
    console.warn('i18n load failed:', e);
  }
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });
}

document.addEventListener('DOMContentLoaded', initI18n);
