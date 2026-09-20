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
  // Server-provided items are the source of truth on first load; afterwards
  // the cart survives navigation via sessionStorage. Lazy init keeps this out
  // of an effect (no cascading render, no hydration flash).
  const [items, setItems] = useState<CartItemInput[]>(() => {
    if (initialItems.length > 0) return initialItems;
    try {
      const raw =
        typeof window === "undefined"
          ? null
          : sessionStorage.getItem(STORAGE_KEY);
      return raw ? dedupe(JSON.parse(raw)) : initialItems;
    } catch {
      return initialItems;
    }
  });

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
