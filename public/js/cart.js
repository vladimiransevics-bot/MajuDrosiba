function getCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartCount() {
  const total = getCart().reduce((s, i) => s + i.qty, 0);
  const el = document.getElementById('cart-count');
  if (el) el.textContent = total;
}

function calcTotal(cart) {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}

function render() {
  const cart = getCart();
  const itemsEl = document.getElementById('cart-items');
  const sidebar = document.getElementById('cart-sidebar');
  const totalEl = document.getElementById('cart-total-val');

  updateCartCount();

  if (!cart.length) {
    itemsEl.innerHTML = `<p class="cart-empty-msg">${t('cart_empty')}</p>`;
    sidebar.style.display = 'none';
    return;
  }

  sidebar.style.display = '';
  totalEl.textContent = calcTotal(cart).toFixed(2) + ' €';

  itemsEl.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item-name">${item.name}</div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="changeQty(${idx}, -1)">−</button>
        <span class="qty-val">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
        <span class="cart-item-price">${(item.price * item.qty).toFixed(2)} €</span>
        <button class="remove-btn" onclick="removeItem(${idx})" title="Noņemt">×</button>
      </div>
    </div>`).join('');
}

function t(key) {
  return (window.i18n && window.i18n(key)) || key;
}

function changeQty(idx, delta) {
  const cart = getCart();
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart(cart);
  render();
}

function removeItem(idx) {
  const cart = getCart();
  cart.splice(idx, 1);
  saveCart(cart);
  render();
}

document.addEventListener('DOMContentLoaded', () => {
  render();

  document.getElementById('order-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const cart = getCart();
    if (!cart.length) return;

    const total = calcTotal(cart);
    const payload = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      address: form.address.value.trim(),
      items: cart,
      total,
      notes: form.notes.value.trim()
    };

    const msg = document.getElementById('order-msg');
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        localStorage.removeItem('cart');
        msg.textContent = t('cart_success');
        msg.className = 'form-msg form-msg--ok';
        form.reset();
        document.getElementById('cart-items').innerHTML = `<p class="cart-empty-msg">${t('cart_success')}</p>`;
        document.getElementById('cart-sidebar').style.display = 'none';
        updateCartCount();
      } else {
        throw new Error();
      }
    } catch (_) {
      msg.textContent = t('contact_form_error');
      msg.className = 'form-msg form-msg--err';
      btn.disabled = false;
    }
  });
});

document.addEventListener('langChanged', render);
