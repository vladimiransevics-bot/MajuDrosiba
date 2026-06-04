let allProducts = [];
let allCategories = [];
let activeCat = '';

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
  if (ex) ex.qty++; else cart.push({ id, name, price, qty: 1 });
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  btn.textContent = '✓';
  setTimeout(() => btn.textContent = (window.i18n && window.i18n('shop_add')) || '+ Cart', 1500);
}

function renderProducts(products) {
  const lang = getLang();
  const grid = document.getElementById('product-grid');
  if (!products.length) {
    grid.innerHTML = `<div class="products-empty">${(window.i18n && window.i18n('shop_empty')) || 'Nav produktu'}</div>`;
    return;
  }
  grid.innerHTML = products.map(p => {
    const name = p['name_' + lang] || p.name_lv;
    const desc = p['desc_' + lang] || p.desc_lv || '';
    const imgHtml = p.image_url
      ? `<img src="${p.image_url}" alt="${name}" loading="lazy">`
      : `<svg class="product-img-placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
    return `<div class="product-card">
      <div class="product-img">${imgHtml}</div>
      <div class="product-body">
        <div class="product-name">${name}</div>
        <div class="product-desc">${desc}</div>
        <div class="product-footer">
          <div class="product-price">${p.price.toFixed(2)}<span> €</span></div>
          <button class="btn btn-primary btn-add" onclick="addToCart(${p.id},'${name.replace(/'/g, "\\'")}',${p.price},this)">+ Cart</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderFilters(categories) {
  const lang = getLang();
  const bar = document.getElementById('shop-filter');
  const params = new URLSearchParams(window.location.search);
  activeCat = params.get('category') || '';

  const allBtn = bar.querySelector('[data-cat=""]');
  if (allBtn) allBtn.classList.toggle('active', activeCat === '');

  categories.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (c.id === activeCat ? ' active' : '');
    btn.dataset.cat = c.id;
    btn.textContent = c['name_' + lang] || c.name_lv;
    bar.appendChild(btn);
  });

  bar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCat = btn.dataset.cat;
    const filtered = activeCat ? allProducts.filter(p => p.category_id === activeCat) : allProducts;
    renderProducts(filtered);
  });
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

  renderFilters(allCategories);

  const params = new URLSearchParams(window.location.search);
  activeCat = params.get('category') || '';
  const filtered = activeCat ? allProducts.filter(p => p.category_id === activeCat) : allProducts;
  renderProducts(filtered);
}

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('langChanged', () => {
  const lang = getLang();
  document.querySelectorAll('#shop-filter .filter-btn[data-cat]').forEach(btn => {
    if (!btn.dataset.cat) return;
    const cat = allCategories.find(c => c.id === btn.dataset.cat);
    if (cat) btn.textContent = cat['name_' + lang] || cat.name_lv;
  });
  renderProducts(activeCat ? allProducts.filter(p => p.category_id === activeCat) : allProducts);
});
