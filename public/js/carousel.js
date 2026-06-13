/**
 * Shared service-page product carousel.
 * Usage on each service page:
 *   <script src="../js/carousel.js"></script>
 *   <script>initCarousel({ service: 'video', placeholder: '📷' });</script>
 *
 * Requires markup:
 *   <section class="svc-carousel" id="svc-carousel" style="display:none">
 *     <div class="carousel-outer">
 *       <div class="carousel-viewport" id="car-viewport">
 *         <div class="carousel-track" id="car-track"></div>
 *       </div>
 *     </div>
 *   </section>
 */
(function() {
  const SPEED_PX_PER_FRAME = 0.6;
  const RESUME_DELAY_MS    = 2000;

  function getBtnText() {
    const t = window.i18n && window.i18n('car_add');
    return (t && t !== 'car_add') ? t : '+';
  }

  window.initCarousel = function(opts) {
    const SERVICE     = opts.service;
    const PLACEHOLDER = opts.placeholder || '📦';

    let cachedItems = [];
    let viewport, track, section;
    let scrollPos   = 0;
    let paused      = false;
    let isDragging  = false;
    let dragStartX  = 0;
    let dragStartScroll = 0;
    let resumeTimer = null;
    let touchedCard = null;

    function renderTrack() {
      if (!cachedItems.length) return;
      const lang = localStorage.getItem('lang') || 'lv';
      const btn  = getBtnText();
      const preOrder = (window.i18n && window.i18n('shop_pre_order') !== 'shop_pre_order') ? window.i18n('shop_pre_order') : 'Pēc pasūtījuma';
      const cards = cachedItems.map(function(p) {
        if (window.cacheProduct) window.cacheProduct(p);
        const name = p['name_' + lang] || p.name_lv;
        const safeName = name.replace(/'/g, "\\'");
        const img = p.image_url
          ? '<img src="' + p.image_url + '" class="car-card-img" alt="" loading="lazy" draggable="false">'
          : '<div class="car-card-placeholder">' + PLACEHOLDER + '</div>';
        const stockBadge = !p.in_stock
          ? '<div class="car-stock-badge" data-i18n="shop_pre_order">' + preOrder + '</div>'
          : '';
        return '<div class="car-card' + (!p.in_stock ? ' is-pre-order' : '') + '" data-pid="' + p.id + '">' + img +
          stockBadge +
          '<div class="car-card-body">' +
          '<div class="car-card-name">' + name + '</div>' +
          '<div class="car-card-price">' + (window.PriceFmt ? window.PriceFmt.format(p.price) : p.price.toFixed(2) + ' €') + '</div>' +
          '<button class="car-card-btn" onclick="carAddToCart(' + p.id + ',\'' +
            safeName + '\',' + p.price + ',this);event.stopPropagation();">' +
            btn +
          '</button></div></div>';
      }).join('');
      // duplicate for seamless loop
      track.innerHTML = cards + cards;
    }

    function loopWidth() { return track.scrollWidth / 2; }

    function normalize() {
      const lw = loopWidth();
      if (lw <= 0) return;
      scrollPos = viewport.scrollLeft;
      if (scrollPos >= lw)      { scrollPos -= lw; viewport.scrollLeft = scrollPos; }
      else if (scrollPos < 0)   { scrollPos += lw; viewport.scrollLeft = scrollPos; }
    }

    function tick() {
      if (!paused && !isDragging) {
        const lw = loopWidth();
        const vw = viewport.clientWidth;
        if (lw > vw) {
          scrollPos += SPEED_PX_PER_FRAME;
          if (scrollPos >= lw) scrollPos -= lw;
          viewport.scrollLeft = scrollPos;
        }
      }
      requestAnimationFrame(tick);
    }

    function setupInteraction() {
      // Open product modal on card click (not on button)
      viewport.addEventListener('click', function(e) {
        if (e.target.closest('button')) return;
        const card = e.target.closest('.car-card[data-pid]');
        if (!card) return;
        const prod = window._productCache && window._productCache[parseInt(card.dataset.pid)];
        if (prod && window.openProductModal) window.openProductModal(prod);
      });

      // Pause on mouse hover
      viewport.addEventListener('mouseenter', function() { paused = true; });
      viewport.addEventListener('mouseleave', function() {
        if (!isDragging) {
          scrollPos = viewport.scrollLeft;
          paused = false;
        }
      });

      // Mouse drag-to-scroll (skip if click started on an interactive element)
      viewport.addEventListener('mousedown', function(e) {
        if (e.target.closest('button, a, input, select, textarea')) return;
        isDragging = true;
        dragStartX = e.pageX;
        dragStartScroll = viewport.scrollLeft;
        viewport.classList.add('dragging');
        e.preventDefault();
      });
      window.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        viewport.scrollLeft = dragStartScroll - (e.pageX - dragStartX);
      });
      window.addEventListener('mouseup', function() {
        if (!isDragging) return;
        isDragging = false;
        viewport.classList.remove('dragging');
        normalize();
      });

      // Touch — native horizontal scroll; pause auto-scroll while user interacts
      viewport.addEventListener('touchstart', function(e) {
        paused = true;
        if (resumeTimer) clearTimeout(resumeTimer);
        const card = e.target.closest('.car-card');
        if (card) {
          if (touchedCard && touchedCard !== card) touchedCard.classList.remove('touch-active');
          card.classList.add('touch-active');
          touchedCard = card;
        }
      }, { passive: true });

      viewport.addEventListener('touchend', function() {
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = setTimeout(function() {
          normalize();
          paused = false;
          if (touchedCard) {
            touchedCard.classList.remove('touch-active');
            touchedCard = null;
          }
        }, RESUME_DELAY_MS);
      }, { passive: true });
    }

    function start() {
      viewport = document.getElementById('car-viewport');
      track    = document.getElementById('car-track');
      section  = document.getElementById('svc-carousel');
      if (!viewport || !track || !section) return;

      fetch('/api/carousel/' + SERVICE)
        .then(function(r) { return r.ok ? r.json() : []; })
        .then(function(items) {
          if (!items.length) return;
          cachedItems = items;
          renderTrack();
          setupInteraction();
          section.style.display = 'block';
          requestAnimationFrame(tick);
        })
        .catch(function() {});

      // Re-render when language changes (also fires after initial i18n load)
      document.addEventListener('langChanged', function() {
        if (!cachedItems.length) return;
        const sl = viewport.scrollLeft;
        renderTrack();
        viewport.scrollLeft = sl;
      });
      // Re-render when VAT toggle flips on the shop
      document.addEventListener('vatChanged', function() {
        if (!cachedItems.length) return;
        const sl = viewport.scrollLeft;
        renderTrack();
        viewport.scrollLeft = sl;
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  };

  // Global handler used by car-card-btn onclick
  window.carAddToCart = function(id, name, price, btn) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const ex = cart.find(function(i) { return i.id === id; });
    if (ex) ex.qty++;
    else {
      const cached = window._productCache && window._productCache[id];
      const sku = cached ? (cached.sku || '') : '';
      cart.push({ id: id, sku: sku, name: name, price: price, qty: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    btn.textContent = '✓';
    setTimeout(function() { btn.textContent = getBtnText(); }, 1500);
  };
})();
