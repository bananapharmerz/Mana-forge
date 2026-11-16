"use client";

import { useEffect, useSyncExternalStore } from "react";

// Budget filter for the commander page's card grids. The grids stay server-rendered (the page is
// cached for an hour), so instead of re-rendering them we set data-budget on their wrapper and
// let CSS hide the tiles over the limit (each EdhrecCardTile carries a data-band). The choice
// lives in the URL (?budget=2 or ?budget=5) so a budget list can be shared.
type Budget = "2" | "5" | "any";
const OPTIONS: { value: Budget; label: string }[] = [
  { value: "2", label: "Under $2" },
  { value: "5", label: "Under $5" },
  { value: "any", label: "Any price" },
];

// Only 2 and 5 are real limits; anything else in the URL means "Any price".
const parse = (v: string | null): Budget => (v === "2" || v === "5" ? v : "any");

// The URL is the store: read it in the browser rather than with useSearchParams, which would make
// the cached page render on every request. The server always renders "Any price".
const CHANGE = "budgetchange";
const subscribe = (cb: () => void) => {
  window.addEventListener(CHANGE, cb);
  window.addEventListener("popstate", cb);
  return () => {
    window.removeEventListener(CHANGE, cb);
    window.removeEventListener("popstate", cb);
  };
};
const fromUrl = (): Budget => parse(new URLSearchParams(window.location.search).get("budget"));

export default function BudgetChips({ targetId }: { targetId: string }) {
  const budget = useSyncExternalStore(subscribe, fromUrl, () => "any" as Budget);

  useEffect(() => {
    document.getElementById(targetId)?.setAttribute("data-budget", budget);
  }, [budget, targetId]);

  const choose = (b: Budget) => {
    const url = new URL(window.location.href);
    if (b === "any") url.searchParams.delete("budget");
    else url.searchParams.set("budget", b);
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new Event(CHANGE));
  };

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter cards by price">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => choose(o.value)}
            aria-pressed={budget === o.value}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              budget === o.value
                ? "border-gold bg-gold text-black"
                : "border-white/15 text-[#cdbf9e] hover:border-gold/60 hover:text-[#f5ecd6]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        Prices are approximate market prices from Scryfall, not offers from Mana Forge.
        {budget !== "any" && " Cards with no price are hidden in budget views."}
      </p>
    </div>
  );
}
