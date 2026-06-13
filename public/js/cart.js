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
  totalEl.textContent = window.PriceFmt.format(calcTotal(cart));

  itemsEl.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item-name">${item.name}</div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="changeQty(${idx}, -1)">−</button>
        <span class="qty-val">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
        <span class="cart-item-price">${window.PriceFmt.format(item.price * item.qty)}</span>
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

function updateB2BVisibility() {
  const isLegal = document.querySelector('input[name="customer_type"]:checked').value === 'legal';
  const b2b = document.getElementById('b2b-fields');
  b2b.classList.toggle('active', isLegal);
  ['company_name','reg_nr','legal_address'].forEach(n => {
    const el = document.querySelector(`[name="${n}"]`);
    if (el) el.required = isLegal;
  });
}

function loadCustomerInfo() {
  const saved = JSON.parse(localStorage.getItem('customer_info') || '{}');
  if (saved.customer_type === 'legal') {
    document.getElementById('ct-legal').checked = true;
  }
  ['name','phone','email','address','company_name','reg_nr','vat_nr','legal_address'].forEach(n => {
    const el = document.querySelector(`[name="${n}"]`);
    if (el && saved[n]) el.value = saved[n];
  });
  updateB2BVisibility();
}

function saveCustomerInfo(payload) {
  const { items, total, notes, ...rest } = payload;
  localStorage.setItem('customer_info', JSON.stringify(rest));
}

document.addEventListener('DOMContentLoaded', () => {
  render();
  loadCustomerInfo();

  document.querySelectorAll('input[name="customer_type"]').forEach(r => {
    r.addEventListener('change', updateB2BVisibility);
  });

  document.getElementById('order-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const cart = getCart();
    if (!cart.length) return;

    const customer_type = form.customer_type.value;
    const total = window.PriceFmt.display(calcTotal(cart));
    const payload = {
      customer_type,
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      address: form.address.value.trim(),
      company_name: form.company_name.value.trim(),
      reg_nr: form.reg_nr.value.trim(),
      vat_nr: form.vat_nr.value.trim(),
      legal_address: form.legal_address.value.trim(),
      items: cart,
      total,
      notes: form.notes.value.trim()
    };

    if (customer_type === 'legal' && (!payload.company_name || !payload.reg_nr || !payload.legal_address)) {
      const msg = document.getElementById('order-msg');
      msg.textContent = t('cart_b2b_required');
      msg.className = 'form-msg form-msg--err';
      return;
    }

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
        saveCustomerInfo(payload);
        localStorage.removeItem('cart');
        msg.textContent = t('cart_success');
        msg.className = 'form-msg form-msg--ok';
        form.reset();
        loadCustomerInfo();
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
document.addEventListener('vatChanged', render);
