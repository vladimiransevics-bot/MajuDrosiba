(function () {
  window._productCache = {};
  window.cacheProduct = function (p) { window._productCache[p.id] = p; };

  let _current = null;

  function getLang() { return localStorage.getItem('lang') || 'lv'; }

  function fmtPrice(raw) {
    return window.PriceFmt ? window.PriceFmt.format(raw) : raw.toFixed(2) + ' €';
  }

  function cartAdd(id, sku, name, price) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const ex = cart.find(function (i) { return i.id === id; });
    if (ex) ex.qty++;
    else cart.push({ id: id, sku: sku || '', name: name, price: price, qty: 1 });
    localStorage.setItem('cart', JSON.stringify(cart));
    const countEl = document.getElementById('cart-count');
    if (countEl) countEl.textContent = cart.reduce(function (s, i) { return s + i.qty; }, 0);
  }

  function closeModal() {
    var el = document.getElementById('product-modal');
    if (el) el.style.display = 'none';
    document.body.style.overflow = '';
    _current = null;
  }

  function rerenderPrice() {
    if (!_current) return;
    document.getElementById('modal-price').textContent = fmtPrice(_current.price);
  }

  function rerenderText() {
    if (!_current) return;
    var lang = getLang();
    document.getElementById('modal-name').textContent = _current['name_' + lang] || _current.name_lv || '';
    document.getElementById('modal-desc').innerHTML = _current['desc_' + lang] || _current.desc_lv || '';
    var addBtn = document.getElementById('modal-add-btn');
    if (addBtn) addBtn.textContent = (window.i18n && window.i18n('shop_add') !== 'shop_add') ? window.i18n('shop_add') : '+ Cart';
  }

  window.openProductModal = async function (p) {
    _current = p;
    var lang = getLang();
    var name = p['name_' + lang] || p.name_lv || '';

    document.getElementById('modal-name').textContent = name;
    document.getElementById('modal-price').textContent = fmtPrice(p.price);
    document.getElementById('modal-desc').innerHTML = p['desc_' + lang] || p.desc_lv || '';

    var stockEl = document.getElementById('modal-stock');
    if (!p.in_stock) {
      var preOrder = (window.i18n && window.i18n('shop_pre_order') !== 'shop_pre_order') ? window.i18n('shop_pre_order') : 'Pēc pasūtījuma';
      var delivery = (window.i18n && window.i18n('shop_delivery_time') !== 'shop_delivery_time') ? window.i18n('shop_delivery_time') : 'Piegāde 7–14 darba dienas';
      stockEl.innerHTML = '<strong>' + preOrder + '</strong> · ' + delivery;
      stockEl.style.display = '';
    } else {
      stockEl.style.display = 'none';
    }

    var mainImg = document.getElementById('modal-main-img');
    if (p.image_url) {
      mainImg.src = p.image_url;
      mainImg.style.display = '';
    } else {
      mainImg.src = '';
      mainImg.style.display = 'none';
    }

    var thumbsEl = document.getElementById('modal-thumbs');
    thumbsEl.innerHTML = '';

    var addBtn = document.getElementById('modal-add-btn');
    addBtn.textContent = (window.i18n && window.i18n('shop_add') !== 'shop_add') ? window.i18n('shop_add') : '+ Cart';
    addBtn.onclick = function () {
      cartAdd(p.id, p.sku, name, p.price);
      addBtn.textContent = '✓';
      setTimeout(function () {
        addBtn.textContent = (window.i18n && window.i18n('shop_add') !== 'shop_add') ? window.i18n('shop_add') : '+ Cart';
      }, 1500);
    };

    document.getElementById('product-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    try {
      var imgs = await fetch('/api/products/' + p.id + '/images').then(function (r) { return r.ok ? r.json() : []; });
      var allUrls = [p.image_url].concat(imgs.map(function (i) { return i.image_url; })).filter(Boolean);
      if (allUrls.length > 1) {
        allUrls.forEach(function (url, idx) {
          var thumb = document.createElement('img');
          thumb.src = url;
          thumb.dataset.src = url;
          thumb.className = 'modal-thumb' + (idx === 0 ? ' active' : '');
          thumb.addEventListener('click', function () {
            mainImg.src = url;
            mainImg.style.display = '';
            thumbsEl.querySelectorAll('.modal-thumb').forEach(function (t) {
              t.classList.toggle('active', t.dataset.src === url);
            });
          });
          thumbsEl.appendChild(thumb);
        });
      }
    } catch (e) {}
  };

  document.addEventListener('DOMContentLoaded', function () {
    document.body.insertAdjacentHTML('beforeend',
      '<div id="product-modal" class="modal-overlay" style="display:none">' +
        '<div class="modal-box">' +
          '<button class="modal-close" id="modal-close-btn">✕</button>' +
          '<div class="modal-gallery">' +
            '<img class="modal-main-img" id="modal-main-img" src="" alt="">' +
            '<div class="modal-thumbs" id="modal-thumbs"></div>' +
          '</div>' +
          '<div class="modal-info">' +
            '<h2 class="modal-name" id="modal-name"></h2>' +
            '<div class="modal-price" id="modal-price"></div>' +
            '<div class="modal-stock" id="modal-stock" style="display:none"></div>' +
            '<div class="modal-desc" id="modal-desc"></div>' +
            '<button class="btn btn-primary modal-add-btn" id="modal-add-btn">+ Cart</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    document.getElementById('product-modal').addEventListener('click', function (e) {
      if (e.target.id === 'product-modal') closeModal();
    });
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    document.addEventListener('vatChanged', rerenderPrice);
    document.addEventListener('langChanged', rerenderText);
  });
})();
