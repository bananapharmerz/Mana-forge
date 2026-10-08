"use client";

import { useEffect, useMemo, useState } from "react";
import { getLivePrices } from "@/app/actions/prices";
import type { LivePriceMap } from "@/lib/livePrice";

// Tracked prices for a set of printings. Re-fetches (debounced) when cards are added or swapped.
export function useLivePrices(ids: string[]): LivePriceMap {
  const key = useMemo(() => [...new Set(ids)].sort().join(","), [ids]);
  const [prices, setPrices] = useState<LivePriceMap>({});
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const t = setTimeout(() => {
      getLivePrices(key.split(","))
        .then((p) => {
          if (!cancelled) setPrices((old) => ({ ...old, ...p }));
        })
        .catch(() => {});
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [key]);
  return prices;
}
