import React, { useEffect, useState } from 'react';
let useCart;
try {
  // try to import hook if running inside the React app context
  // Path uses lowercase to match file name
  // eslint-disable-next-line import/no-unresolved
  useCart = require('./cartcontext').useCart;
} catch (e) {
  useCart = null;
}

const CartIcon = () => {
  const [local, setLocal] = useState({ itemCount: 0, total: 0 });

  // If React context is available, use it; otherwise fall back to global cart events
  let ctx;
  try { if (useCart) ctx = useCart(); } catch (e) { ctx = null; }

  useEffect(() => {
    if (ctx && typeof ctx.itemCount !== 'undefined') {
      // nothing to do: React will re-render when context changes
      return;
    }

    function onChange(e) {
      const totalsRaw = (e && e.detail && typeof e.detail.totals !== 'undefined') ? e.detail.totals : null;
      // normalize subtotal from different producers (some send a number, others an object)
      let subtotal = 0;
      if (typeof totalsRaw === 'number') subtotal = totalsRaw;
      else if (totalsRaw && typeof totalsRaw.subtotal === 'number') subtotal = totalsRaw.subtotal;
      else if (totalsRaw && typeof totalsRaw.total === 'number') subtotal = totalsRaw.total;

      const items = (e && e.detail && Array.isArray(e.detail.cart)) ? e.detail.cart : [];
      if (items.length || subtotal) {
        setLocal({ itemCount: items.reduce((s,i)=>s+(i.quantity||0),0), total: subtotal || 0 });
      } else {
        // fallback: compute from cart API if present
        try {
          const out = window.ELGARIA_CART && window.ELGARIA_CART.getTotals && window.ELGARIA_CART.getTotals();
          if (out) setLocal({ itemCount: (out.items||[]).reduce((s,i)=>s+(i.quantity||0),0), total: out.subtotal || out.total || 0 });
        } catch (err) {}
      }
    }

    window.addEventListener('elgaria_cart_changed', onChange);
    // initialize with the full totals object when available
    try {
      const initialCart = window.ELGARIA_CART && window.ELGARIA_CART.getItems && window.ELGARIA_CART.getItems();
      const initialTotals = window.ELGARIA_CART && window.ELGARIA_CART.getTotals && window.ELGARIA_CART.getTotals();
      onChange({ detail: { cart: initialCart || [], totals: initialTotals } });
    } catch (err) { /* ignore */ }
    return () => window.removeEventListener('elgaria_cart_changed', onChange);
  }, [ctx]);

  const displayCount = ctx ? ctx.itemCount : local.itemCount;
  const displayTotal = ctx ? ctx.total || ctx.subtotal || 0 : local.total;

  return (
    <div className="text-xl">
      <a href="/cart" className="hover:text-amber-50">
        🛒 ({displayCount}) - ${Number(displayTotal).toFixed(2)}
      </a>
    </div>
  );
};

export default CartIcon;