const WHATSAPP_NUMBER = "918589900277";
const PRODUCTS_KEY = "canteenProducts";

const DEFAULT_PRODUCTS = [
  {id:"b1",name:"Dosa",price:40,category:"Breakfast",icon:"🥞",start:"05:00",end:"11:00",active:true},
  {id:"b2",name:"Idli",price:30,category:"Breakfast",icon:"⚪",start:"05:00",end:"11:00",active:true},
  {id:"b3",name:"Poori Masala",price:45,category:"Breakfast",icon:"🫓",start:"05:00",end:"11:00",active:true},
  {id:"b4",name:"Appam",price:35,category:"Breakfast",icon:"🥞",start:"05:00",end:"11:00",active:true},
  {id:"l1",name:"Meals",price:80,category:"Lunch",icon:"🍚",start:"11:00",end:"15:00",active:true},
  {id:"l2",name:"Chicken Biriyani",price:120,category:"Lunch",icon:"🍗",start:"11:00",end:"15:00",active:true},
  {id:"l3",name:"Veg Biriyani",price:90,category:"Lunch",icon:"🍛",start:"11:00",end:"15:00",active:true},
  {id:"d1",name:"Chapati",price:15,category:"Dinner",icon:"🫓",start:"15:00",end:"22:00",active:true},
  {id:"d2",name:"Parotta",price:20,category:"Dinner",icon:"🫓",start:"15:00",end:"22:00",active:true},
  {id:"d3",name:"Chicken Curry",price:100,category:"Dinner",icon:"🍗",start:"15:00",end:"22:00",active:true},
  {id:"d4",name:"Egg Curry",price:60,category:"Dinner",icon:"🥚",start:"15:00",end:"22:00",active:true},
  {id:"d5",name:"Chicken Biriyani",price:120,category:"Dinner",icon:"🍗",start:"15:00",end:"22:00",active:true},
  {id:"a1",name:"Tea",price:10,category:"Drinks",icon:"☕",start:"00:00",end:"23:59",active:true},
  {id:"a2",name:"Coffee",price:20,category:"Drinks",icon:"☕",start:"00:00",end:"23:59",active:true},
  {id:"a3",name:"Water Bottle",price:15,category:"Drinks",icon:"💧",start:"00:00",end:"23:59",active:true},
  {id:"a4",name:"Juice",price:40,category:"Drinks",icon:"🧃",start:"00:00",end:"23:59",active:true},
  {id:"s1",name:"Samosa",price:15,category:"Snacks",icon:"🥟",start:"00:00",end:"23:59",active:true},
  {id:"s2",name:"Vada",price:15,category:"Snacks",icon:"🍩",start:"00:00",end:"23:59",active:true}
];

let products = loadProducts();
let cart = JSON.parse(localStorage.getItem("canteenCart") || "{}");
let selectedCategory = "All";
let searchText = "";
let adminTapCount = 0;
let adminTapTimer = null;

const $ = id => document.getElementById(id);
const money = n => `₹${Number(n || 0).toFixed(0)}`;

function loadProducts() {
  const saved = localStorage.getItem(PRODUCTS_KEY);
  if (!saved) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return structuredClone(DEFAULT_PRODUCTS);
  }
  try { return JSON.parse(saved); }
  catch { localStorage.setItem(PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS)); return structuredClone(DEFAULT_PRODUCTS); }
}

function reloadProductsFromStorage() {
  try {
    const saved = localStorage.getItem(PRODUCTS_KEY);
    if (saved) products = JSON.parse(saved);
  } catch {}
}

function timeToMinutes(t) {
  const [h,m] = String(t || "00:00").split(":").map(Number);
  return (h * 60) + m;
}

function isItemAvailable(item, now = new Date()) {
  if (!item.active) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(item.start);
  const end = timeToMinutes(item.end);
  if (start === end) return true;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end; // overnight period
}

function currentMeal() {
  const mins = new Date().getHours() * 60 + new Date().getMinutes();
  if (mins >= 300 && mins < 660) return "Breakfast";
  if (mins >= 660 && mins < 900) return "Lunch";
  if (mins >= 900 && mins < 1320) return "Dinner";
  return null;
}

function getTimeBasedProducts() {
  const now = new Date();
  return products.filter(p => isItemAvailable(p, now));
}

function refreshTimeBasedMenu() {
  // IMPORTANT: reload admin changes before every time refresh.
  reloadProductsFromStorage();

  const available = getTimeBasedProducts();
  const meal = currentMeal();

  if (meal === "Breakfast") $("menuTitle").textContent = "🌅 Breakfast Menu";
  else if (meal === "Lunch") $("menuTitle").textContent = "☀️ Lunch Menu";
  else if (meal === "Dinner") $("menuTitle").textContent = "🌙 Dinner Menu";
  else $("menuTitle").textContent = "🍽️ Canteen Menu";

  const now = new Date();
  $("menuTime").textContent =
    `Updated ${now.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})} · ${available.length} item(s) available`;

  const validIds = new Set(available.map(p => p.id));
  Object.keys(cart).forEach(id => {
    if (!validIds.has(id)) delete cart[id];
  });
  saveCart();

  renderCategories();
  renderItems();
  renderCart();
}

function renderCategories() {
  const available = getTimeBasedProducts();
  const meal = currentMeal();
  const cats = ["All", "Drinks", "Snacks"];
  if (meal) cats.push(meal);

  const existingAvailableCats = [...new Set(available.map(p => p.category))];
  existingAvailableCats.forEach(c => {
    if (!cats.includes(c) && c !== "Breakfast" && c !== "Lunch" && c !== "Dinner") cats.push(c);
  });

  if (!cats.includes(selectedCategory)) selectedCategory = "All";

  $("categoryChips").innerHTML = cats.map(c =>
    `<button class="category-chip ${selectedCategory === c ? "active" : ""}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join("");

  document.querySelectorAll(".category-chip").forEach(btn => {
    btn.onclick = () => {
      selectedCategory = btn.dataset.cat;
      renderCategories();
      renderItems();
    };
  });
}

function renderItems() {
  const available = getTimeBasedProducts().filter(p => {
    const categoryOK = selectedCategory === "All" || p.category === selectedCategory;
    const searchOK = !searchText || p.name.toLowerCase().includes(searchText.toLowerCase());
    return categoryOK && searchOK;
  });

  $("itemsGrid").innerHTML = available.map(p => {
    const qty = Number(cart[p.id] || 0);
    return `<div class="col-6 col-md-4 col-lg-3">
      <div class="food-card">
        <div class="food-icon">${escapeHtml(p.icon || "🍽️")}</div>
        <div class="food-name">${escapeHtml(p.name)}</div>
        <div class="food-price">${money(p.price)}</div>
        <div class="mt-3">
          ${qty === 0 ? `<button class="btn btn-dark w-100 add-btn" onclick="addToCart('${p.id}')">+ Add</button>` :
          `<div class="qty-control">
            <button onclick="changeQty('${p.id}', -1)">−</button>
            <span>${qty}</span>
            <button onclick="changeQty('${p.id}', 1)">+</button>
          </div>`}
        </div>
      </div>
    </div>`;
  }).join("");

  $("emptyState").classList.toggle("d-none", available.length !== 0);
}

function addToCart(id) {
  reloadProductsFromStorage();
  if (!getTimeBasedProducts().some(p => p.id === id)) return;
  cart[id] = Number(cart[id] || 0) + 1;
  saveCart();
  renderItems();
  renderCart();
}

function changeQty(id, delta) {
  const next = Number(cart[id] || 0) + delta;
  if (next <= 0) delete cart[id];
  else cart[id] = next;
  saveCart();
  renderItems();
  renderCart();
}

function saveCart() {
  localStorage.setItem("canteenCart", JSON.stringify(cart));
}

function renderCart() {
  reloadProductsFromStorage();
  let total = 0, count = 0;
  const rows = [];

  Object.entries(cart).forEach(([id, qty]) => {
    const p = products.find(x => x.id === id);
    if (!p || !isItemAvailable(p)) return;
    const amount = p.price * qty;
    total += amount;
    count += qty;
    rows.push({p, qty, amount});
  });

  $("cartItems").innerHTML = rows.length ? rows.map(({p,qty,amount}) => `
    <div class="cart-line">
      <div><strong>${escapeHtml(p.name)}</strong><br><small>${money(p.price)} × ${qty}</small></div>
      <div class="text-end"><strong>${money(amount)}</strong><br>
        <button class="btn btn-sm btn-link text-danger p-0" onclick="changeQty('${p.id}', -${qty})">Remove</button>
      </div>
    </div>`).join("") : `<div class="text-center text-muted py-4">Your cart is empty.</div>`;

  $("cartTotal").textContent = total.toFixed(0);
  $("cartBadge").textContent = count;
  $("floatingCount").textContent = count;
  $("floatingTotal").textContent = total.toFixed(0);
}

function clearCartAndFields() {
  cart = {};
  saveCart();
  $("customerName").value = "";
  $("tableRoom").value = "";
  $("orderNote").value = "";
  renderItems();
  renderCart();
}

function sendWhatsApp() {
  reloadProductsFromStorage();
  const rows = [];
  let total = 0;

  Object.entries(cart).forEach(([id, qty]) => {
    const p = products.find(x => x.id === id);
    if (!p || !isItemAvailable(p)) return;
    const amount = p.price * qty;
    total += amount;
    rows.push({p, qty, amount});
  });

  if (!rows.length) {
    alert("Please add at least one available item.");
    return;
  }

  const name = $("customerName").value.trim();
  const table = $("tableRoom").value.trim();
  const note = $("orderNote").value.trim();

  let msg = "🍽️ CANTEEN ORDER\n";
  msg += "━━━━━━━━━━━━━━━━\n";
  msg += `👤 Name: ${name || "-"}\n`;
  msg += `🪑 Table/Room: ${table || "-"}\n\n`;
  msg += "Items:\n";
  rows.forEach(({p, qty, amount}) => {
    msg += `• ${p.name} × ${qty} = ${money(amount)}\n`;
  });
  msg += `\n💰 TOTAL: ${money(total)}\n`;
  msg += `\n📝 Note: ${note || "-"}\n\n`;
  msg += "Thank you.";

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank", "noopener,noreferrer");

  // Clear cart immediately after opening WhatsApp.
  clearCartAndFields();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

// ---------- Admin ----------
function openAdminLogin() {
  $("adminUsername").value = "";
  $("adminPassword").value = "";
  $("adminLoginError").textContent = "";
  bootstrap.Modal.getOrCreateInstance($("adminLoginModal")).show();
}

function adminLogin() {
  const username = $("adminUsername").value.trim().toLowerCase();
  const password = $("adminPassword").value;
  if (username === "admin" && password === "admin123") {
    bootstrap.Modal.getOrCreateInstance($("adminLoginModal")).hide();
    renderAdminItems();
    bootstrap.Modal.getOrCreateInstance($("adminModal")).show();
  } else {
    $("adminLoginError").textContent = "Invalid username or password.";
  }
}

function renderAdminItems() {
  reloadProductsFromStorage();
  $("adminItemsBody").innerHTML = products.map(p => `
    <tr>
      <td>${escapeHtml(p.icon || "🍽️")} ${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.category)}</td>
      <td>${money(p.price)}</td>
      <td>${escapeHtml(p.start)}–${escapeHtml(p.end)}</td>
      <td class="${p.active ? "status-on" : "status-off"}">${p.active ? "Shown" : "Hidden"}</td>
      <td class="text-nowrap">
        <button class="btn btn-sm btn-outline-primary" onclick="editAdminItem('${p.id}')">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteAdminItem('${p.id}')">Delete</button>
      </td>
    </tr>`).join("");
}

function showAddItemForm() {
  $("adminForm").classList.remove("d-none");
  $("editItemId").value = "";
  $("foodName").value = "";
  $("foodPrice").value = "";
  $("foodCategory").value = "Breakfast";
  $("foodStart").value = "05:00";
  $("foodEnd").value = "11:00";
  $("foodIcon").value = "🍽️";
  $("foodActive").checked = true;
}

function editAdminItem(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  $("adminForm").classList.remove("d-none");
  $("editItemId").value = p.id;
  $("foodName").value = p.name;
  $("foodPrice").value = p.price;
  $("foodCategory").value = p.category;
  $("foodStart").value = p.start;
  $("foodEnd").value = p.end;
  $("foodIcon").value = p.icon || "🍽️";
  $("foodActive").checked = !!p.active;
}

function saveAdminItem() {
  const name = $("foodName").value.trim();
  const price = Number($("foodPrice").value);
  if (!name || !Number.isFinite(price) || price < 0) {
    alert("Enter a valid food name and price.");
    return;
  }

  const id = $("editItemId").value || ("p_" + Date.now().toString(36));
  const item = {
    id,
    name,
    price,
    category: $("foodCategory").value,
    start: $("foodStart").value || "00:00",
    end: $("foodEnd").value || "23:59",
    icon: $("foodIcon").value.trim() || "🍽️",
    active: $("foodActive").checked
  };

  const index = products.findIndex(x => x.id === id);
  if (index >= 0) products[index] = item;
  else products.push(item);

  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  $("adminForm").classList.add("d-none");
  renderAdminItems();
  refreshTimeBasedMenu(); // immediately refresh customer menu
}

function deleteAdminItem(id) {
  const p = products.find(x => x.id === id);
  if (!p || !confirm(`Delete "${p.name}"?`)) return;
  products = products.filter(x => x.id !== id);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  delete cart[id];
  saveCart();
  renderAdminItems();
  refreshTimeBasedMenu();
}

function adminLogout() {
  bootstrap.Modal.getOrCreateInstance($("adminModal")).hide();
  $("adminForm").classList.add("d-none");
}

// Events
$("searchInput").addEventListener("input", e => {
  searchText = e.target.value.trim();
  renderItems();
});
$("clearCart").addEventListener("click", clearCartAndFields);
$("sendWhatsapp").addEventListener("click", sendWhatsApp);
$("adminLoginBtn").addEventListener("click", adminLogin);
$("adminOpenBtn").addEventListener("click", openAdminLogin);
$("footerAdminBtn").addEventListener("click", openAdminLogin);
$("addItemBtn").addEventListener("click", showAddItemForm);
$("saveItemBtn").addEventListener("click", saveAdminItem);
$("cancelItemBtn").addEventListener("click", () => $("adminForm").classList.add("d-none"));
$("adminLogout").addEventListener("click", adminLogout);

$("brandAdminTrigger").addEventListener("click", () => {
  adminTapCount++;
  clearTimeout(adminTapTimer);
  adminTapTimer = setTimeout(() => { adminTapCount = 0; }, 1800);
  if (adminTapCount >= 5) {
    adminTapCount = 0;
    openAdminLogin();
  }
});

// INITIAL
refreshTimeBasedMenu();

// IMPORTANT: re-check menu and localStorage every 30 seconds.
// This changes the visible menu automatically as time periods start/end.
setInterval(refreshTimeBasedMenu, 30000);

// Also refresh immediately when another browser tab changes menu data.
window.addEventListener("storage", e => {
  if (e.key === PRODUCTS_KEY || e.key === "canteenCart") refreshTimeBasedMenu();
});

// Refresh when the app becomes visible again.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshTimeBasedMenu();
});


// Allow Enter key from admin login fields.
["adminUsername", "adminPassword"].forEach(id => {
  $(id).addEventListener("keydown", e => {
    if (e.key === "Enter") adminLogin();
  });
});
