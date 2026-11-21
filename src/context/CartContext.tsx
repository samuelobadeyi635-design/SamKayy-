import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { BasketItem } from '../types';

const STORAGE_KEY = 'samkay_basket_v1';

interface CartContextValue {
  items: BasketItem[];
  totalUnits: number;
  distinctCount: number;
  lastAddedFeedback: string | null;
  clearFeedback: () => void;
  addItem: (item: BasketItem) => void;
  updateItemQuantity: (productId: number, sizeLabel: string, quantity: number) => void;
  updateItemSize: (productId: number, oldSizeLabel: string, newSizeLabel: string) => void;
  removeItem: (productId: number, sizeLabel: string) => void;
  clearBasket: () => void;
}

const CartContext = createContext<CartContextValue>({
  items: [],
  totalUnits: 0,
  distinctCount: 0,
  lastAddedFeedback: null,
  clearFeedback: () => {},
  addItem: () => {},
  updateItemQuantity: () => {},
  updateItemSize: () => {},
  removeItem: () => {},
  clearBasket: () => {},
});

function loadStoredBasket(): BasketItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i) =>
        i &&
        Number.isInteger(Number(i.productId)) &&
        typeof i.sizeLabel === 'string' &&
        Number.isInteger(Number(i.quantity)) &&
        Number(i.quantity) > 0
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BasketItem[]>(() => loadStoredBasket());
  const [lastAddedFeedback, setLastAddedFeedback] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota errors
    }
  }, [items]);

  const clearFeedback = useCallback(() => setLastAddedFeedback(null), []);

  const addItem = useCallback((incoming: BasketItem) => {
    const qty = Math.max(1, Math.floor(Number(incoming.quantity) || 1));
    setItems((prev) => {
      const idx = prev.findIndex(
        (p) => p.productId === incoming.productId && p.sizeLabel === incoming.sizeLabel
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + qty,
        };
        return next;
      }
      return [...prev, { ...incoming, quantity: qty }];
    });
    setLastAddedFeedback(`Added ${qty} × ${incoming.productName} (${incoming.sizeLabel}) to your Quantity basket.`);
  }, []);

  const updateItemQuantity = useCallback((productId: number, sizeLabel: string, quantity: number) => {
    const cleanQty = Math.floor(Number(quantity));
    if (!Number.isFinite(cleanQty) || cleanQty <= 0) return;
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId && item.sizeLabel === sizeLabel
          ? { ...item, quantity: cleanQty }
          : item
      )
    );
  }, []);

  const updateItemSize = useCallback((productId: number, oldSizeLabel: string, newSizeLabel: string) => {
    if (oldSizeLabel === newSizeLabel) return;
    setItems((prev) => {
      const current = prev.find((i) => i.productId === productId && i.sizeLabel === oldSizeLabel);
      if (!current) return prev;
      const existingTarget = prev.find((i) => i.productId === productId && i.sizeLabel === newSizeLabel);
      if (existingTarget) {
        return prev
          .filter((i) => !(i.productId === productId && i.sizeLabel === oldSizeLabel))
          .map((i) =>
            i.productId === productId && i.sizeLabel === newSizeLabel
              ? { ...i, quantity: i.quantity + current.quantity }
              : i
          );
      }
      return prev.map((i) =>
        i.productId === productId && i.sizeLabel === oldSizeLabel
          ? { ...i, sizeLabel: newSizeLabel }
          : i
      );
    });
  }, []);

  const removeItem = useCallback((productId: number, sizeLabel: string) => {
    setItems((prev) => prev.filter((i) => !(i.productId === productId && i.sizeLabel === sizeLabel)));
  }, []);

  const clearBasket = useCallback(() => {
    setItems([]);
  }, []);

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const distinctCount = items.length;

  return (
    <CartContext.Provider
      value={{
        items,
        totalUnits,
        distinctCount,
        lastAddedFeedback,
        clearFeedback,
        addItem,
        updateItemQuantity,
        updateItemSize,
        removeItem,
        clearBasket,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
