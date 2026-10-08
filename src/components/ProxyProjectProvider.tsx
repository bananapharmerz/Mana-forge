"use client";

import { createContext, useContext } from "react";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import type { ProxyCard } from "@/lib/proxyTypes";

const EMPTY: ProxyCard[] = [];
const STORAGE_KEY = "mtg-hub:proxy-project";

interface ProxyProjectContextValue {
  cards: ProxyCard[];
  addCard: (card: Omit<ProxyCard, "quantity">) => void;
  updateQuantity: (scryfallId: string, quantity: number) => void;
  removeCard: (scryfallId: string) => void;
  clear: () => void;
  totalCount: number;
}

const ProxyProjectContext = createContext<ProxyProjectContextValue | null>(null);

export default function ProxyProjectProvider({ children }: { children: React.ReactNode }) {
  const [cards, setCards] = useLocalStorageState<ProxyCard[]>(STORAGE_KEY, EMPTY);

  function addCard(card: Omit<ProxyCard, "quantity">) {
    setCards((prev) => {
      const existing = prev.find((c) => c.scryfallId === card.scryfallId);
      if (existing) {
        return prev.map((c) =>
          c.scryfallId === card.scryfallId ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { ...card, quantity: 1 }];
    });
  }

  function updateQuantity(scryfallId: string, quantity: number) {
    setCards((prev) =>
      quantity <= 0
        ? prev.filter((c) => c.scryfallId !== scryfallId)
        : prev.map((c) => (c.scryfallId === scryfallId ? { ...c, quantity } : c))
    );
  }

  function removeCard(scryfallId: string) {
    setCards((prev) => prev.filter((c) => c.scryfallId !== scryfallId));
  }

  function clear() {
    setCards([]);
  }

  const totalCount = cards.reduce((s, c) => s + c.quantity, 0);

  return (
    <ProxyProjectContext.Provider
      value={{ cards, addCard, updateQuantity, removeCard, clear, totalCount }}
    >
      {children}
    </ProxyProjectContext.Provider>
  );
}

export function useProxyProject() {
  const ctx = useContext(ProxyProjectContext);
  if (!ctx) throw new Error("useProxyProject must be used within ProxyProjectProvider");
  return ctx;
}
