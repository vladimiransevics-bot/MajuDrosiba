const LANGS = ['lv', 'ru', 'en'];
const DEFAULT_LANG = 'lv';
let translations = {};

function getBrowserLang() {
  const lang = (navigator.language || '').slice(0, 2).toLowerCase();
  return LANGS.includes(lang) ? lang : DEFAULT_LANG;
}

function getLang() {
  return localStorage.getItem('lang') || getBrowserLang();
}

// Derive deploy-root from this script's own URL — works on any subpath
// (localhost, /MajuDrosiba/, /door-website/, custom domain, etc.)
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

async function setLanguage(lang) {
  if (!LANGS.includes(lang)) return;
  localStorage.setItem('lang', lang);
  try {
    await loadLang(lang);
  } catch(e) { return; }
  applyTranslations();
  document.dispatchEvent(new Event('langChanged'));
}

window.i18n = key => translations[key] !== undefined ? translations[key] : key;

async function initI18n() {
  const lang = getLang();
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
