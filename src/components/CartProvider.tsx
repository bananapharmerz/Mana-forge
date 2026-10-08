"use client";

import { createContext, useContext } from "react";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import type { CartItem } from "@/lib/cartTypes";

const EMPTY: CartItem[] = [];
const STORAGE_KEY = "mtg-hub:cart";

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  totalCents: number;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useLocalStorageState<CartItem[]>(STORAGE_KEY, EMPTY);

  function addItem(item: Omit<CartItem, "quantity">) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function updateQuantity(productId: string, quantity: number) {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  }

  function clear() {
    setItems([]);
  }

  const totalCents = items.reduce((s, i) => s + i.priceCents * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clear, totalCents, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
