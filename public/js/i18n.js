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

async function loadLang(lang) {
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  const prefix = depth > 1 ? '../'.repeat(depth - 1) : '';
  const res = await fetch(`${prefix}lang/${lang}.json`);
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
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === getLang());
  });
  document.documentElement.lang = getLang();
}

async function setLanguage(lang) {
  if (!LANGS.includes(lang)) return;
  localStorage.setItem('lang', lang);
  await loadLang(lang);
  applyTranslations();
}

async function initI18n() {
  const lang = getLang();
  await loadLang(lang);
  applyTranslations();
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });
}

document.addEventListener('DOMContentLoaded', initI18n);
