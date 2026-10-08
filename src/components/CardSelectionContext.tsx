"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { DeckCard } from "@/lib/deckTypes";

interface CardSelectionContextValue {
  selected: DeckCard[];
  // [commanderId, partnerId] pairs picked together — saved as the deck's two commanders.
  pairs: [string, string][];
  // Selected cards that were picked as a *companion* (kept apart from the commander when saving).
  companionIds: string[];
  isSelected: (scryfallId: string) => boolean;
  toggle: (card: DeckCard, opts?: { companion?: boolean }) => void;
  // Selects two cards as one pair (or removes both if the pair is already selected) — used for
  // a named "Partner with X" pair and for a partner the player picked themselves.
  togglePair: (card: DeckCard, partner: DeckCard) => void;
  remove: (scryfallId: string) => void;
  clear: () => void;
}

const CardSelectionContext = createContext<CardSelectionContextValue | null>(null);

export function CardSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedMap, setSelectedMap] = useState<Map<string, DeckCard>>(new Map());
  // Both directions are stored so either half of a pair finds the other.
  const [pairMap, setPairMap] = useState<Map<string, string>>(new Map());
  const [companionSet, setCompanionSet] = useState<Set<string>>(new Set());

  const isSelected = useCallback((scryfallId: string) => selectedMap.has(scryfallId), [selectedMap]);

  const removeWithPartner = useCallback((scryfallId: string) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      next.delete(scryfallId);
      return next;
    });
    setCompanionSet((prev) => {
      if (!prev.has(scryfallId)) return prev;
      const next = new Set(prev);
      next.delete(scryfallId);
      return next;
    });
    setPairMap((prev) => {
      const partnerId = prev.get(scryfallId);
      if (!partnerId) return prev;
      const next = new Map(prev);
      next.delete(scryfallId);
      next.delete(partnerId);
      return next;
    });
  }, []);

  const toggle = useCallback(
    (card: DeckCard, opts?: { companion?: boolean }) => {
      if (selectedMap.has(card.scryfallId)) {
        const partnerId = pairMap.get(card.scryfallId);
        removeWithPartner(card.scryfallId);
        if (partnerId) removeWithPartner(partnerId);
      } else {
        setSelectedMap((prev) => new Map(prev).set(card.scryfallId, card));
        if (opts?.companion) setCompanionSet((prev) => new Set(prev).add(card.scryfallId));
      }
    },
    [selectedMap, pairMap, removeWithPartner]
  );

  const togglePair = useCallback(
    (card: DeckCard, partner: DeckCard) => {
      if (selectedMap.has(card.scryfallId) && selectedMap.has(partner.scryfallId)) {
        removeWithPartner(card.scryfallId);
        removeWithPartner(partner.scryfallId);
        return;
      }
      setSelectedMap((prev) => {
        const next = new Map(prev);
        next.set(card.scryfallId, card);
        next.set(partner.scryfallId, partner);
        return next;
      });
      setPairMap((prev) => {
        const next = new Map(prev);
        next.set(card.scryfallId, partner.scryfallId);
        next.set(partner.scryfallId, card.scryfallId);
        return next;
      });
    },
    [selectedMap, removeWithPartner]
  );

  const remove = useCallback(
    (scryfallId: string) => {
      const partnerId = pairMap.get(scryfallId);
      removeWithPartner(scryfallId);
      if (partnerId) removeWithPartner(partnerId);
    },
    [pairMap, removeWithPartner]
  );

  const clear = useCallback(() => {
    setSelectedMap(new Map());
    setPairMap(new Map());
    setCompanionSet(new Set());
  }, []);

  const value = useMemo(() => {
    const seen = new Set<string>();
    const pairs: [string, string][] = [];
    pairMap.forEach((partnerId, id) => {
      if (seen.has(id) || seen.has(partnerId)) return;
      seen.add(id);
      seen.add(partnerId);
      pairs.push([id, partnerId]);
    });
    return {
      selected: Array.from(selectedMap.values()),
      pairs,
      companionIds: Array.from(companionSet),
      isSelected,
      toggle,
      togglePair,
      remove,
      clear,
    };
  }, [selectedMap, pairMap, companionSet, isSelected, toggle, togglePair, remove, clear]);

  return <CardSelectionContext.Provider value={value}>{children}</CardSelectionContext.Provider>;
}

export function useCardSelection(): CardSelectionContextValue {
  const ctx = useContext(CardSelectionContext);
  if (!ctx) throw new Error("useCardSelection must be used within a CardSelectionProvider");
  return ctx;
}
