"use client";

import { useEffect, useState } from "react";
import { BRACKET_LISTS_UPDATED } from "@/lib/bracketLists";
import { estimate, inList, loadGameChangerSet, MLD, TURNS } from "@/lib/bracket";

// Wizards' article on the Commander Brackets and the Game Changers list.
const BRACKETS_ARTICLE = "https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-february-9-2026";

function CardList({ label, names }: { label: string; names: string[] }) {
  if (names.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-[11px] font-semibold text-muted">
        {label} <span className="text-gold-bright">{names.length}</span>
      </p>
      <ul className="space-y-0.5">
        {names.map((n) => (
          <li key={n} className="truncate text-xs text-gold-bright">
            {n}
          </li>
        ))}
      </ul>
    </div>
  );
}

// A free "Estimated bracket" badge, worked out in the browser from the deck already on the page.
// It lists exactly which cards set the bracket so players can argue about the right thing.
// It's a conversation starter for "what bracket is your deck?", not a rating.
export default function GameChangersPanel({ cards }: { cards: string[] }) {
  const [list, setList] = useState<Set<string> | null>(null);
  useEffect(() => {
    let live = true;
    loadGameChangerSet().then((l) => live && setList(l));
    return () => {
      live = false;
    };
  }, []);

  // Scryfall hasn't answered (or is down): show nothing rather than a bracket that's too low.
  if (!list || list.size === 0) return null;

  const unique = Array.from(new Set(cards)).sort();
  const gc = unique.filter((c) => inList(c, list));
  const mld = unique.filter((c) => inList(c, MLD));
  const turns = unique.filter((c) => inList(c, TURNS));
  const est = estimate(gc.length, mld.length, turns.length);

  return (
    <div className="card-frame mt-4 p-4">
      <h3 className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Estimated bracket (unofficial)
        <span className="rounded border border-current px-2 py-0.5 text-sm text-gold-bright">{est.badge}</span>
      </h3>
      <p className="text-sm text-foreground">{est.text}</p>
      <CardList label="Game Changers" names={gc} />
      <CardList label="Mass land denial" names={mld} />
      <CardList label="Extra turns" names={turns} />
      <p className="mt-3 text-[10px] leading-snug text-muted">
        Unofficial estimate, not made or endorsed by Wizards of the Coast. Checks Game Changers, mass land denial and
        extra turns only, not combos or tutors. Lists updated {BRACKET_LISTS_UPDATED}.{" "}
        <a href={BRACKETS_ARTICLE} target="_blank" rel="noopener noreferrer" className="underline hover:text-gold-bright">
          How brackets work
        </a>
      </p>
    </div>
  );
}
