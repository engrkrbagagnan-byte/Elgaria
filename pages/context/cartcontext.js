import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';

// 1. Create the Context object
export const CartContext = createContext();

// 2. Define the Provider Component
export const CartProvider = ({ children }) => {
  // State to hold the cart items: [{ id: 'watch-a', quantity: 1, price: 599.00, name: 'The Classic' }, ...]
  const [cartItems, setCartItems] = useState([]);
  const STORAGE_KEY = 'elgaria_cart';

  // Load initial cart from localStorage (keeps parity with non-React pages)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const items = JSON.parse(raw);
        setCartItems(items);
      }
    } catch (e) {
      // ignore parse errors
    }

    // Listen for external cart changes (from cart.js) and update context
    function onExternal(e) {
      try {
        const external = e.detail && e.detail.cart ? e.detail.cart : null;
        if (external) {
          // external is an array of items
          setCartItems(external);
        }
      } catch (err) {}
    }
    window.addEventListener('elgaria_cart_changed', onExternal);
    return () => window.removeEventListener('elgaria_cart_changed', onExternal);
  }, []);

  // Function to find an item in the cart by ID
  const findItem = (id) => cartItems.find(item => item.id === id);

  // 3. Core Cart Actions
  const saveAndEmit = (items) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) {}
    // dispatch event so non-React UI can pick up changes
    const totals = items.reduce((acc, it) => acc + (it.price || 0) * (it.quantity || 0), 0);
    const ev = new CustomEvent('elgaria_cart_changed', { detail: { cart: items, totals } });
    window.dispatchEvent(ev);
  };

  const addItemToCart = (product, quantity = 1) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(i => i.id === product.id);
      let next;
      if (existingItem) {
        next = prevItems.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      } else {
        next = [
          ...prevItems,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            image: (product.images && product.images[0]) || product.image || '',
            quantity: quantity,
          },
        ];
      }
      // persist and notify
      saveAndEmit(next);
      return next;
    });
  };

  const removeItemFromCart = (id) => {
    setCartItems(prevItems => {
      const next = prevItems.filter(item => item.id !== id);
      saveAndEmit(next);
      return next;
    });
  };

  const updateItemQuantity = (id, newQuantity) => {
    setCartItems(prevItems => {
      let next;
      if (newQuantity <= 0) {
        next = prevItems.filter(item => item.id !== id);
      } else {
        next = prevItems.map(item => item.id === id ? { ...item, quantity: newQuantity } : item);
      }
      saveAndEmit(next);
      return next;
    });
  };
  
  // 4. Calculated Values (Memoized for performance)
  const cartTotals = useMemo(() => {
    const subtotal = cartItems.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 0), 0);
    const taxRate = 0.05; // Example tax rate (5%)
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    const itemCount = cartItems.reduce((s, it) => s + (it.quantity || 0), 0);

    return { subtotal, tax, total, itemCount };
  }, [cartItems]); // Recalculate only when cartItems changes

  // 5. Value provided by the context
  const contextValue = {
    cartItems,
    addItemToCart,
    removeItemFromCart,
    updateItemQuantity,
    ...cartTotals,
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

// 6. Custom Hook for easy component access
export const useCart = () => {
  return useContext(CartContext);
};