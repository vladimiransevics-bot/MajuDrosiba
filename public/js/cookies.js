/**
 * GDPR cookie consent banner + Google Consent Mode v2 integration.
 * Must load BEFORE gtag.js so the consent defaults are set first.
 *
 * Flow:
 *   1. Set default consent to 'denied' for ads/analytics (Consent Mode v2).
 *   2. Read existing decision from localStorage (`cookieConsent`).
 *      - 'accepted'  → grant all, no banner.
 *      - 'declined'  → keep denied, no banner.
 *      - missing     → show banner.
 *   3. User clicks Accept or Decline → store + update consent + hide banner.
 */
(function () {
  // gtag shim — safe to call before the remote script loads
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  // Google Consent Mode v2 — deny by default (EU/GDPR safe)
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });

  function grantAll() {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted'
    });
  }

  var saved = null;
  try { saved = localStorage.getItem('cookieConsent'); } catch (e) {}
  if (saved === 'accepted') { grantAll(); return; }
  if (saved === 'declined') return;

  // i18n strings — inline to avoid waiting for i18n.js
  var lang = (document.documentElement.lang || 'lv').slice(0, 2);
  var STR = {
    lv: { text: 'Mēs izmantojam sīkdatnes, lai uzlabotu vietnes darbību un analizētu trafiku. Vairāk uzziniet mūsu',
          privacy: 'privātuma politikā', accept: 'Pieņemt visus', decline: 'Tikai nepieciešamie' },
    ru: { text: 'Мы используем cookies для улучшения работы сайта и анализа трафика. Подробнее в нашей',
          privacy: 'политике конфиденциальности', accept: 'Принять все', decline: 'Только необходимые' },
    en: { text: 'We use cookies to improve site performance and analyze traffic. Learn more in our',
          privacy: 'privacy policy', accept: 'Accept all', decline: 'Necessary only' }
  };
  var t = STR[lang] || STR.lv;
  var privacyPath = lang === 'lv' ? '/privacy.html' : '/' + lang + '/privacy.html';

  function render() {
    var banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');

    var inner = document.createElement('div');
    inner.className = 'cookie-banner-inner';

    var text = document.createElement('p');
    text.className = 'cookie-banner-text';
    text.appendChild(document.createTextNode(t.text + ' '));
    var link = document.createElement('a');
    link.href = privacyPath;
    link.textContent = t.privacy;
    text.appendChild(link);
    text.appendChild(document.createTextNode('.'));

    var actions = document.createElement('div');
    actions.className = 'cookie-banner-actions';

    var decline = document.createElement('button');
    decline.className = 'cookie-btn cookie-btn-decline';
    decline.type = 'button';
    decline.textContent = t.decline;

    var accept = document.createElement('button');
    accept.className = 'cookie-btn cookie-btn-accept';
    accept.type = 'button';
    accept.textContent = t.accept;

    actions.appendChild(decline);
    actions.appendChild(accept);
    inner.appendChild(text);
    inner.appendChild(actions);
    banner.appendChild(inner);
    document.body.appendChild(banner);
    requestAnimationFrame(function () { banner.classList.add('cookie-banner-show'); });

    function hide() {
      banner.classList.remove('cookie-banner-show');
      setTimeout(function () { banner.remove(); }, 250);
    }
    accept.addEventListener('click', function () {
      try { localStorage.setItem('cookieConsent', 'accepted'); } catch (e) {}
      grantAll();
      hide();
    });
    decline.addEventListener('click', function () {
      try { localStorage.setItem('cookieConsent', 'declined'); } catch (e) {}
      hide();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
