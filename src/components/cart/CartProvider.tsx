"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { CartItemInput } from "@/lib/actions/orders";

type CartContextType = {
  items: CartItemInput[];
  setQty: (productId: number, qty: number) => void;
  replaceAll: (items: CartItemInput[]) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextType>({
  items: [],
  setQty: () => {},
  replaceAll: () => {},
  clear: () => {},
});

export const useCart = () => useContext(CartContext);

const STORAGE_KEY = "gg-cart";

// One entry per product — older sessions may have stored duplicates.
function dedupe(items: CartItemInput[]): CartItemInput[] {
  const map = new Map<number, number>();
  for (const i of items) {
    if (!(i.quantity > 0)) continue;
    map.set(i.productId, (map.get(i.productId) ?? 0) + i.quantity);
  }
  return [...map].map(([productId, quantity]) => ({ productId, quantity }));
}

export function CartProvider({
  children,
  initialItems,
}: {
  children: React.ReactNode;
  initialItems: CartItemInput[];
}) {
  const [items, setItems] = useState<CartItemInput[]>(initialItems);

  // Server-provided items are the source of truth on first load; afterwards
  // the cart survives navigation via sessionStorage.
  useEffect(() => {
    if (initialItems.length === 0) {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) setItems(dedupe(JSON.parse(raw)));
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const setQty = (productId: number, qty: number) =>
    setItems((prev) => {
      const next = prev.filter((i) => i.productId !== productId);
      if (qty > 0) next.push({ productId, quantity: qty });
      return next;
    });

  const replaceAll = (next: CartItemInput[]) => setItems(dedupe(next));
  const clear = () => setItems([]);

  return (
    <CartContext.Provider value={{ items, setQty, replaceAll, clear }}>
      {children}
    </CartContext.Provider>
  );
}
