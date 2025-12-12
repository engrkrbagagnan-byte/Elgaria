// Simple cart implementation shared across pages
(function(){
  const STORAGE_KEY = 'elgaria_cart';
  const bus = window; // simple event target

  // Internal cart state
  let cart = {};
  // Last announcement message to populate ARIA live region (cleared after used)
  let lastAnnouncement = '';

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      cart = raw ? JSON.parse(raw) : {};
    } catch (e) { cart = {}; }
    emitChange();
  }

  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); emitChange(); }

  function getItems() { return Object.values(cart); }

  function getTotals() {
    const items = getItems();
    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
    return { items, subtotal };
  }

  function addItem(item, qty = 1) {
    if (!item || !item.id) return;
    const prevQty = cart[item.id]?.quantity || 0;
    if (!cart[item.id]) cart[item.id] = { ...item, quantity: 0 };
    cart[item.id].quantity += qty;
    if (prevQty > 0) lastAnnouncement = `Increased quantity of ${item.name} in your cart.`;
    else lastAnnouncement = (qty > 1) ? `Added ${qty} × ${item.name} to your cart.` : `Added ${item.name} to your cart.`;
    save();
  }

  function removeItem(id) {
    if (!cart[id]) return;
    const old = cart[id];
    lastAnnouncement = `Removed ${old.name} from your cart.`;
    delete cart[id];
    save();
  }

  function updateQty(id, qty) {
    if (!cart[id]) return;
    const prev = cart[id].quantity;
    cart[id].quantity = qty;
    if (cart[id].quantity <= 0) {
      lastAnnouncement = `Removed ${cart[id].name} from your cart.`;
      delete cart[id];
    } else {
      lastAnnouncement = (qty > prev) ? `Increased quantity of ${cart[id].name} to ${qty}.` : `Decreased quantity of ${cart[id].name} to ${qty}.`;
    }
    save();
  }

  function clear() { lastAnnouncement = 'Cart cleared.'; cart = {}; save(); }

  function emitChange() {
    const ev = new CustomEvent('elgaria_cart_changed', { detail: { cart: getItems(), totals: getTotals() } });
    bus.dispatchEvent(ev);
    // Announce via live region if present (set by DOM). Clear lastAnnouncement after announcing.
    try {
      if (lastAnnouncement) {
        const live = document.getElementById('cart-live');
        if (live) {
          live.textContent = lastAnnouncement;
          // clear the stored message so load/other events don't re-announce
          lastAnnouncement = '';
          // clear the live region text after a few seconds to keep DOM tidy
          setTimeout(() => { if (live && live.textContent) live.textContent = ''; }, 4000);
        }
      }
    } catch (e) { /* ignore DOM-related errors during initialization */ }
  }

  // Expose global API
  window.ELGARIA_CART = {
    addItem, removeItem, updateQty, clear, getItems, getTotals
  };

  // Basic DOM UI integration for pages that include the overlay/drawer
  function bindUI() {
    const cartButton = document.getElementById('cart-button');
    const cartCountEl = document.getElementById('cart-count');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartClose = document.getElementById('cart-close');
    const cartBody = cartDrawer && cartDrawer.querySelector('.cart-body');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const clearBtn = document.getElementById('clear-cart');

    if (!cartDrawer) return; // no cart UI on this page

    function renderCount() {
      const { items } = getTotals();
      const count = items.reduce((s, it) => s + it.quantity, 0);
      if (cartCountEl) {
        if (count > 0) { cartCountEl.style.display = 'inline-block'; cartCountEl.textContent = count; }
        else { cartCountEl.style.display = 'none'; }
      }
    }

    function renderCart() {
      const { items, subtotal } = getTotals();
      if (!cartBody) return;
      cartBody.innerHTML = '';
      if (items.length === 0) {
        cartBody.innerHTML = '<p class="text-sm text-gray-600">Your cart is empty.</p>';
        if (cartSubtotal) cartSubtotal.textContent = '$0.00';
        return;
      }
      const list = document.createElement('div');
      list.className = 'space-y-4';
      items.forEach(it => {
        const el = document.createElement('div');
        el.className = 'flex items-center space-x-3';
        el.innerHTML = `
          <img src="${it.image}" alt="${it.name}" class="w-16 h-12 object-cover rounded">
          <div class="flex-1 text-sm">
            <div class="font-medium">${it.name}</div>
            <div class="text-gray-500">$${(it.price).toFixed(2)}</div>
          </div>
          <div class="text-sm flex items-center space-x-2">
            <button data-action="decrease" data-id="${it.id}" class="px-2 py-1 bg-gray-100 rounded">-</button>
            <span>${it.quantity}</span>
            <button data-action="increase" data-id="${it.id}" class="px-2 py-1 bg-gray-100 rounded">+</button>
          </div>
          <button data-action="remove" data-id="${it.id}" class="ml-3 text-red-500">Remove</button>
        `;
        list.appendChild(el);
      });
      cartBody.appendChild(list);
      if (cartSubtotal) cartSubtotal.textContent = '$' + subtotal.toFixed(2);
    }

    // Focus management helpers for accessibility (focus trap within drawer)
    let previouslyFocused = null;
    const focusableSelectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function trapFocus(container) {
      previouslyFocused = document.activeElement;
      const focusable = Array.from(container.querySelectorAll(focusableSelectors));
      if (focusable.length) focusable[0].focus();

      function handleKey(e) {
        if (e.key === 'Tab') {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault(); last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
          }
        } else if (e.key === 'Escape') {
          // Close the cart on Escape
          closeCart();
        }
      }

      container.__focusHandler = handleKey;
      document.addEventListener('keydown', handleKey);
    }

    function releaseFocus(container) {
      if (container && container.__focusHandler) {
        document.removeEventListener('keydown', container.__focusHandler);
        delete container.__focusHandler;
      }
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      previouslyFocused = null;
    }

    // track previous body overflow to restore after closing cart
    let _previousBodyOverflow = '';

    function openCart() {
      cartOverlay.classList.add('open');
      cartDrawer.classList.add('open');
      cartDrawer.setAttribute('aria-hidden', 'false');
      renderCart();
      // lock background scroll
      try { _previousBodyOverflow = document.body.style.overflow || ''; document.body.style.overflow = 'hidden'; } catch (e) {}
      trapFocus(cartDrawer);
    }

    function closeCart() {
      cartOverlay.classList.remove('open');
      cartDrawer.classList.remove('open');
      cartDrawer.setAttribute('aria-hidden', 'true');
      // restore background scroll
      try { document.body.style.overflow = _previousBodyOverflow || ''; } catch (e) {}
      releaseFocus(cartDrawer);
    }

    function pulseCart() { if (cartButton) { cartButton.classList.add('pop'); setTimeout(() => cartButton.classList.remove('pop'), 360); } }

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-id]');
      if (btn && btn.dataset.id) {
        const id = btn.dataset.id;
        const name = btn.dataset.name || 'Product';
        const price = Number(btn.dataset.price) || 0;
        const image = btn.dataset.image || '';
        addItem({ id, name, price, image }, 1);
        pulseCart();
      }

      if (e.target.closest('#cart-button')) { openCart(); }
      if (e.target.closest('#cart-close') || e.target === cartOverlay) { closeCart(); }

      const act = e.target.closest('[data-action]');
      if (act) {
        const action = act.dataset.action;
        const id = act.dataset.id;
        if (action === 'remove') removeItem(id);
        if (action === 'increase') updateQty(id, (cart[id]?.quantity || 0) + 1);
        if (action === 'decrease') updateQty(id, (cart[id]?.quantity || 0) - 1);
      }
  });

    clearBtn && clearBtn.addEventListener('click', () => { clear(); renderCart(); renderCount(); });

    // Update UI on cart changes
    bus.addEventListener('elgaria_cart_changed', () => { renderCart(); renderCount(); });

    // initial render
    renderCount(); renderCart();
  }

  // init
  load();
  // Bind UI after DOM is ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindUI);
  else bindUI();
})();
