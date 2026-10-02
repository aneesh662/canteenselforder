let menuItems = [];
let productCache = {};
let cart = {};
let selectedCategory = 'All';

const $ = (id) => document.getElementById(id);

function money(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

function cartQuantity() {
  return Object.values(cart).reduce((sum, qty) => sum + Number(qty || 0), 0);
}

function cartTotal() {
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = productCache[id];
    return sum + (item ? Number(item.price) * Number(qty) : 0);
  }, 0);
}

function cartProductCount() {
  return Object.keys(cart).length;
}

function getCartItem(id) {
  return productCache[String(id)] || menuItems.find(item => Number(item.id) === Number(id));
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.category-btn').forEach((button) => {
    button.addEventListener('click', () => {
      selectedCategory = button.dataset.category;
      document.querySelectorAll('.category-btn').forEach((item) => {
        item.classList.remove('active', 'btn-dark');
        item.classList.add('btn-outline-dark');
      });
      button.classList.add('active', 'btn-dark');
      button.classList.remove('btn-outline-dark');
      renderMenu();
    });
  });

  $('contactNumber').addEventListener('input', (event) => {
    event.target.value = event.target.value.replace(/[^0-9+()\-\s]/g, '').slice(0, 15);
  });

  loadMenu();
  setInterval(loadMenu, 30000);
});

async function loadMenu() {
  try {
    const response = await fetch('/api/menu', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load menu.');

    menuItems = data.items || [];
    menuItems.forEach((item) => {
      productCache[String(item.id)] = item;
    });

    $('menuStatus').textContent = `Menu: ${data.meal || 'All-day items'} • Updated ${data.updated}`;
    renderMenu();
    renderCart();
  } catch (error) {
    showAlert('Could not load the menu. Please refresh and try again.', 'danger');
  }
}

function renderMenu() {
  const menu = $('menu');
  const items = selectedCategory === 'All'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

  if (!items.length) {
    menu.innerHTML = '<div class="col-12"><div class="empty-box">No food available in this category right now.</div></div>';
    return;
  }

  menu.innerHTML = items.map((item) => {
    const quantity = Number(cart[item.id] || 0);
    const selected = quantity > 0;
    const stock = Number(item.stock || 0);
    const stockClass = stock <= 5 ? 'text-bg-danger' : 'text-bg-success';

    return `
      <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
        <article class="food-card h-100 ${selected ? 'selected-food' : ''}">
          <div class="food-card-top">
            <div class="food-icon" aria-hidden="true">${escapeHtml(item.icon)}</div>
            ${selected ? '<span class="selected-check" aria-label="Selected">✓</span>' : ''}
          </div>
          <div class="food-name">${escapeHtml(item.name)}</div>
          <div class="food-category">${escapeHtml(item.category)}</div>
          <div class="food-meta">
            <strong>${money(item.price)}</strong>
            <span class="badge ${stockClass}">${stock} left</span>
          </div>
          <button
            class="btn ${selected ? 'btn-success' : 'btn-dark'} w-100 mt-3 add-cart-btn"
            type="button"
            onclick="addToCart(${item.id})"
            ${stock < 1 ? 'disabled' : ''}
          >
            ${selected ? `✓ In Cart • ${quantity}` : 'Add to Cart'}
          </button>
        </article>
      </div>`;
  }).join('');
}

function addToCart(id) {
  const item = getCartItem(id);
  if (!item) return;

  const stock = Number(item.stock || 0);
  const current = Number(cart[id] || 0);
  if (stock <= 0) {
    showAlert(`${item.name} is out of stock.`, 'warning');
    return;
  }

  if (current >= stock) {
    showAlert(`Only ${stock} of ${item.name} is available.`, 'warning');
    openCart();
    return;
  }

  cart[id] = current + 1;
  renderMenu();
  renderCart();
  showAlert(`${item.name} added to your cart.`, 'success');
}

function changeQty(id, delta) {
  const item = getCartItem(id);
  if (!item) return;

  const current = Number(cart[id] || 0);
  const next = current + Number(delta);
  const stock = Number(item.stock || 0);

  if (next <= 0) {
    delete cart[id];
  } else if (next > stock) {
    showAlert(`Only ${stock} of ${item.name} is currently available.`, 'warning');
    return;
  } else {
    cart[id] = next;
  }

  renderMenu();
  renderCart();
}

function removeFromCart(id) {
  delete cart[id];
  renderMenu();
  renderCart();
}

function renderCart() {
  const box = $('cart');
  const ids = Object.keys(cart);
  const itemCount = cartQuantity();
  const productCount = cartProductCount();
  const total = cartTotal();

  $('cartSliderTitle').textContent = itemCount
    ? `Selected Items (${itemCount})`
    : 'Your Cart is Empty';
  $('cartSliderSummary').textContent = itemCount
    ? `${productCount} food item${productCount === 1 ? '' : 's'} • Tap to review`
    : 'Select food and add it to your cart';
  $('cartSliderTotal').textContent = money(total);
  $('cartCountLabel').textContent = itemCount
    ? `${itemCount} item${itemCount === 1 ? '' : 's'} selected`
    : 'No items selected';
  $('placeOrderBtn').disabled = ids.length === 0;

  if (!ids.length) {
    box.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-icon">🛒</div>
        <strong>Your cart is empty</strong>
        <div class="small text-muted mt-1">Tap <b>Add to Cart</b> on any food item.</div>
      </div>`;
    $('cartTotal').textContent = money(0);
    return;
  }

  box.innerHTML = ids.map((id) => {
    const item = getCartItem(id);
    if (!item) return '';

    const quantity = Number(cart[id]);
    const amount = Number(item.price) * quantity;
    const stock = Number(item.stock || 0);
    const stockProblem = quantity > stock;

    return `
      <div class="selected-cart-item ${stockProblem ? 'stock-problem' : ''}">
        <div class="selected-food-icon" aria-hidden="true">${escapeHtml(item.icon)}</div>
        <div class="selected-cart-main">
          <div class="selected-cart-title-row">
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <div class="small text-muted">${money(item.price)} each</div>
            </div>
            <strong class="selected-line-total">${money(amount)}</strong>
          </div>
          ${stockProblem ? `<div class="small text-danger fw-semibold mt-1">Only ${stock} available now. Reduce quantity.</div>` : ''}
          <div class="cart-actions-row">
            <div class="quantity-control" aria-label="Quantity for ${escapeHtml(item.name)}">
              <button class="qty-btn" type="button" onclick="changeQty(${item.id}, -1)" aria-label="Decrease quantity">−</button>
              <span>${quantity}</span>
              <button class="qty-btn qty-plus" type="button" onclick="changeQty(${item.id}, 1)" aria-label="Increase quantity">+</button>
            </div>
            <button class="remove-btn" type="button" onclick="removeFromCart(${item.id})">Remove</button>
          </div>
        </div>
      </div>`;
  }).join('');

  $('cartTotal').textContent = money(total);
}

function openCart() {
  renderCart();
}

function focusFirstMissingField() {
  const fields = ['customerName', 'contactNumber', 'tableRoom'];
  for (const id of fields) {
    const field = $(id);
    if (!field.value.trim()) {
      field.focus();
      return;
    }
  }
}

async function placeOrder() {
  const ids = Object.keys(cart);
  const name = $('customerName').value.trim();
  const contact = $('contactNumber').value.trim();
  const table = $('tableRoom').value.trim();
  const note = $('note').value.trim();
  const button = $('placeOrderBtn');

  if (!ids.length) return showAlert('Please select at least one food item.', 'warning');
  if (!name) {
    showAlert('Please enter your name.', 'warning');
    focusFirstMissingField();
    return;
  }
  if (!contact) {
    showAlert('Please enter your contact number.', 'warning');
    $('contactNumber').focus();
    return;
  }

  const digits = contact.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    showAlert('Please enter a valid contact number (10-15 digits).', 'warning');
    $('contactNumber').focus();
    return;
  }
  if (!table) {
    showAlert('Please enter your table or room number.', 'warning');
    $('tableRoom').focus();
    return;
  }

  button.disabled = true;
  button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Placing Order...';

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        contact_number: contact,
        table_room: table,
        note,
        items: ids.map(id => ({
          product_id: Number(id),
          quantity: Number(cart[id])
        }))
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not place order.');

    $('successText').textContent = `Order #${data.order_id} has been received by the canteen. Total: ${money(data.total)}.`;
    clearCartAndFields(false);

    const canvas = $('cartOffcanvas');
    const instance = bootstrap.Offcanvas.getInstance(canvas);
    if (instance) instance.hide();

    new bootstrap.Modal($('successModal')).show();
    await loadMenu();
  } catch (error) {
    showAlert(error.message || 'Could not place order.', 'danger');
    await loadMenu();
  } finally {
    button.innerHTML = 'Place Order';
    renderCart();
  }
}

function clearCartAndFields(clearFields = true) {
  cart = {};
  if (clearFields) {
    $('customerName').value = '';
    $('contactNumber').value = '';
    $('tableRoom').value = '';
    $('note').value = '';
  }
  renderMenu();
  renderCart();
}

function showAlert(message, type) {
  $('alertBox').innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show shadow-sm" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
}
