import Link from "next/link";
import type { NeedResult } from "@/lib/ownedList";

// Shows how much of a deck the member already owns, from their real-world owned-card list
// (matched by name, basics excluded). Server-rendered on the deck editor page from the SAVED
// deck — it refreshes when the deck is saved. Private to the owner.
export default function OwnedVsNeeded({
  result,
  hasOwnedList,
}: {
  result: NeedResult;
  hasOwnedList: boolean;
}) {
  if (!hasOwnedList) {
    return (
      <div className="card-frame p-4 text-sm text-muted">
        Tell Mana Forge which cards you own and this deck will show how many you already have.{" "}
        <Link href="/collection" className="font-semibold text-gold-bright hover:underline">
          Add your cards →
        </Link>
      </div>
    );
  }

  if (result.neededNames === 0) {
    return <p className="text-sm text-muted">Add some cards to this deck to see what you already own.</p>;
  }

  const pct = Math.round((result.ownedNames / result.neededNames) * 100);
  return (
    <div className="card-frame p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm text-foreground">
          You own <span className="font-semibold text-gold-bright">{result.ownedNames}</span> of{" "}
          <span className="font-semibold">{result.neededNames}</span> cards in this deck
          <span className="text-muted"> ({pct}%)</span>
        </p>
        <Link href="/collection" className="shrink-0 text-xs font-semibold text-gold-bright hover:underline">
          Update owned cards →
        </Link>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
        <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted">By card name, any printing. Basic lands and tokens are not counted.</p>

      {result.missing.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            Missing ({result.missing.length})
          </summary>
          <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
            {result.missing.map((m) => (
              <li key={m.name} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate text-foreground">{m.name}</span>
                <span className="shrink-0 text-xs text-muted">
                  {m.have > 0 ? `${m.have}/${m.need}` : m.need > 1 ? `need ${m.need}` : "need"}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
