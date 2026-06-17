/**
 * Google Ads — gtag.js bootstrap + helpers (конверсии + динамический ремаркетинг).
 *
 * Заполните два значения из кабинета Google Ads, после чего тег активируется:
 *   AW_ID          — Conversion ID, вид "AW-1234567890" (Settings → Google tag)
 *   PURCHASE_LABEL — Conversion label события «Покупка» (Goals → Conversions → Покупка)
 *
 * Пока AW_ID не заполнен, файл ничего не грузит, а все вызовы window.GAds — no-op.
 * Подключён в <head> всех публичных страниц; на /ru/ и /en/ копируется пререндером.
 */
(function () {
  var AW_ID = 'AW-XXXXXXXXXX';          // TODO: вставьте Conversion ID из Google Ads
  var PURCHASE_LABEL = 'XXXXXXXXXXX';   // TODO: вставьте Conversion label события «Покупка»

  var configured = /^AW-\d+$/.test(AW_ID);

  // dataLayer + gtag shim — безопасны даже до загрузки удалённого скрипта
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  if (configured) {
    gtag('js', new Date());
    gtag('config', AW_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + AW_ID;
    document.head.appendChild(s);
  }

  function item(it) {
    return {
      id: it.sku || String(it.id),
      google_business_vertical: 'retail',
      quantity: it.qty || 1,
      price: it.price
    };
  }

  window.GAds = {
    // Просмотр товара — основной сигнал динамического ремаркетинга
    viewItem: function (p) {
      if (!configured || !p) return;
      gtag('event', 'view_item', {
        send_to: AW_ID,
        value: p.price,
        currency: 'EUR',
        items: [{ id: p.sku || String(p.id), google_business_vertical: 'retail' }]
      });
    },
    // Добавление в корзину — сигнал ремаркетинга
    addToCart: function (it) {
      if (!configured || !it) return;
      gtag('event', 'add_to_cart', {
        send_to: AW_ID,
        value: it.price,
        currency: 'EUR',
        items: [item(it)]
      });
    },
    // Конверсия «Покупка» — после успешно оформленного заказа
    purchase: function (orderId, value, cart) {
      if (!configured) return;
      gtag('event', 'conversion', {
        send_to: AW_ID + '/' + PURCHASE_LABEL,
        transaction_id: String(orderId || ''),
        value: value,
        currency: 'EUR',
        items: (cart || []).map(item)
      });
    }
  };
})();
