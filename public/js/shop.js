let allProducts = [];
let allCategories = [];
let activeCat = '';
let activeSub = '';
let activeSort = 'featured';

function getLang() {
  return localStorage.getItem('lang') || 'lv';
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const el = document.getElementById('cart-count');
  if (el) el.textContent = total;
}

function addToCart(id, name, price, btn) {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const ex = cart.find(i => i.id === id);
  if (ex) ex.qty++;
  else {
    const cached = window._productCache && window._productCache[id];
    const sku = cached ? (cached.sku || '') : '';
    cart.push({ id, sku, name, price, qty: 1 });
  }
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  btn.textContent = '✓';
  setTimeout(() => btn.textContent = (window.i18n && window.i18n('shop_add')) || '+ Cart', 1500);
}

// Build map of category id → list of descendant ids (incl. self)
function buildDescendantMap() {
  const map = {};
  allCategories.forEach(c => { map[c.id] = [c.id]; });
  // For each cat, walk up parents and append self to each ancestor's bucket
  allCategories.forEach(c => {
    let p = c.parent_id;
    while (p) {
      if (map[p] && !map[p].includes(c.id)) map[p].push(c.id);
      const parent = allCategories.find(x => x.id === p);
      p = parent ? parent.parent_id : null;
    }
  });
  return map;
}

function topCategories() {
  return allCategories.filter(c => !c.parent_id);
}
function subsOf(parentId) {
  return allCategories.filter(c => c.parent_id === parentId);
}

function sortProducts(arr) {
  const lang = getLang();
  const copy = arr.slice();
  switch (activeSort) {
    case 'price-asc':  copy.sort((a, b) => a.price - b.price); break;
    case 'price-desc': copy.sort((a, b) => b.price - a.price); break;
    case 'name-asc':   copy.sort((a, b) => (a['name_' + lang] || a.name_lv).localeCompare(b['name_' + lang] || b.name_lv, lang)); break;
    case 'newest':     copy.sort((a, b) => b.id - a.id); break;
    case 'featured':
    default:           copy.sort((a, b) => (b.display_order || 0) - (a.display_order || 0) || b.id - a.id);
  }
  return copy;
}

function filteredProducts() {
  const descMap = buildDescendantMap();
  let list = allProducts;
  if (activeSub) {
    list = list.filter(p => p.category_id === activeSub);
  } else if (activeCat) {
    const ids = descMap[activeCat] || [activeCat];
    list = list.filter(p => ids.includes(p.category_id));
  }
  return sortProducts(list);
}

function renderProducts(products) {
  const lang = getLang();
  const grid = document.getElementById('product-grid');
  const countEl = document.getElementById('shop-count');
  if (countEl) {
    const label = (window.i18n && window.i18n('shop_count')) || 'produkti';
    countEl.textContent = products.length + ' ' + label;
  }
  if (!products.length) {
    grid.innerHTML = `<div class="products-empty">${(window.i18n && window.i18n('shop_empty')) || 'Nav produktu'}</div>`;
    return;
  }
  const moreLabel = (window.i18n && window.i18n('shop_more') !== 'shop_more') ? window.i18n('shop_more') : 'Sīkāk';
  const preOrderLabel = (window.i18n && window.i18n('shop_pre_order') !== 'shop_pre_order') ? window.i18n('shop_pre_order') : 'Pēc pasūtījuma';
  const deliveryLabel = (window.i18n && window.i18n('shop_delivery_time') !== 'shop_delivery_time') ? window.i18n('shop_delivery_time') : 'Piegāde 7–14 darba dienas';
  grid.innerHTML = products.map(p => {
    if (window.cacheProduct) window.cacheProduct(p);
    const name = p['name_' + lang] || p.name_lv;
    const desc = p['desc_' + lang] || p.desc_lv || '';
    const imgHtml = p.image_url
      ? `<img src="${p.image_url}" alt="${name}" loading="lazy">`
      : `<svg class="product-img-placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
    const stockBadge = !p.in_stock
      ? `<div class="product-stock-badge pre-order"><strong data-i18n="shop_pre_order">${preOrderLabel}</strong><span data-i18n="shop_delivery_time">${deliveryLabel}</span></div>`
      : '';
    return `<div class="product-card${!p.in_stock ? ' is-pre-order' : ''}" onclick="window.openProductModal&&window.openProductModal(window._productCache[${p.id}])">
      <div class="product-img">${imgHtml}</div>
      <div class="product-body">
        <div class="product-name">${name}</div>
        ${stockBadge}
        <div class="product-desc">${desc}</div>
        <button type="button" class="product-more" data-i18n="shop_more">${moreLabel}</button>
        <div class="product-footer">
          <div class="product-price">${window.PriceFmt.format(p.price)}</div>
          <button class="btn btn-primary btn-add" onclick="event.stopPropagation();addToCart(${p.id},'${name.replace(/'/g, "\\'")}',${p.price},this)">${(window.i18n && window.i18n('shop_add') !== 'shop_add') ? window.i18n('shop_add') : '+ Cart'}</button>
        </div>
      </div>
    </div>`;
  }).join('');
  requestAnimationFrame(detectClampedDescs);
}

function detectClampedDescs() {
  document.querySelectorAll('.product-card').forEach(card => {
    const desc = card.querySelector('.product-desc');
    if (!desc) return;
    card.classList.toggle('is-clamped', desc.scrollHeight > desc.clientHeight + 1);
  });
}

function renderTopFilter() {
  const lang = getLang();
  const bar = document.getElementById('shop-filter');
  // Keep only the "All" button
  bar.querySelectorAll('.filter-btn[data-cat]:not([data-cat=""])').forEach(b => b.remove());
  const allBtn = bar.querySelector('[data-cat=""]');
  if (allBtn) allBtn.classList.toggle('active', !activeCat);

  topCategories().forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (c.id === activeCat ? ' active' : '');
    btn.dataset.cat = c.id;
    btn.textContent = c['name_' + lang] || c.name_lv;
    bar.appendChild(btn);
  });
}

function renderSubFilter() {
  const lang = getLang();
  const sub = document.getElementById('shop-subfilter');
  sub.innerHTML = '';
  const subs = activeCat ? subsOf(activeCat) : [];
  if (!subs.length) { sub.style.display = 'none'; return; }
  sub.style.display = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn filter-btn--sub' + (!activeSub ? ' active' : '');
  allBtn.dataset.sub = '';
  allBtn.textContent = (window.i18n && window.i18n('shop_all')) || 'Visi';
  sub.appendChild(allBtn);

  subs.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn filter-btn--sub' + (c.id === activeSub ? ' active' : '');
    btn.dataset.sub = c.id;
    btn.textContent = c['name_' + lang] || c.name_lv;
    sub.appendChild(btn);
  });
}

function syncUrl() {
  const params = new URLSearchParams();
  if (activeCat) params.set('category', activeCat);
  if (activeSub) params.set('sub', activeSub);
  if (activeSort && activeSort !== 'featured') params.set('sort', activeSort);
  const qs = params.toString();
  const url = window.location.pathname + (qs ? '?' + qs : '');
  window.history.replaceState(null, '', url);
}

function update() {
  renderTopFilter();
  renderSubFilter();
  renderProducts(filteredProducts());
  syncUrl();
}

function wireUp() {
  document.getElementById('shop-filter').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    activeCat = btn.dataset.cat;
    activeSub = '';
    update();
  });
  document.getElementById('shop-subfilter').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    activeSub = btn.dataset.sub;
    update();
  });
  document.getElementById('shop-sort').addEventListener('change', e => {
    activeSort = e.target.value;
    update();
  });
  const vatEl = document.getElementById('shop-vat');
  if (vatEl) {
    vatEl.checked = window.PriceFmt.isWithVat();
    vatEl.addEventListener('change', () => {
      window.PriceFmt.setWithVat(vatEl.checked);
      // vatChanged listener below handles re-render
    });
  }
}

async function init() {
  updateCartCount();
  try {
    const [productsRes, catsRes] = await Promise.all([
      fetch('/api/products'),
      fetch('/api/categories')
    ]);
    allProducts = productsRes.ok ? await productsRes.json() : [];
    allCategories = catsRes.ok ? await catsRes.json() : [];
  } catch (_) {
    allProducts = [];
    allCategories = [];
  }

  const params = new URLSearchParams(window.location.search);
  activeCat = params.get('category') || '';
  activeSub = params.get('sub') || '';
  activeSort = params.get('sort') || 'featured';
  const sortSel = document.getElementById('shop-sort');
  if (sortSel) sortSel.value = activeSort;

  wireUp();
  update();
}

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('langChanged', update);
document.addEventListener('vatChanged', update);
