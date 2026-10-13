"use client";

import { useEffect, useState } from "react";
import { BRACKET_LISTS_UPDATED, EXTRA_TURNS, MASS_LAND_DENIAL } from "@/lib/bracketLists";

// Wizards' article on the Commander Brackets and the Game Changers list.
const BRACKETS_ARTICLE = "https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-february-9-2026";

// One request per page view at most, shared by every panel on the page.
let listPromise: Promise<Set<string>> | null = null;
function loadList(): Promise<Set<string>> {
  listPromise ??= fetch("/api/game-changers")
    .then((r) => (r.ok ? r.json() : { names: [] }))
    .then((j: { names?: string[] }) => new Set((j.names ?? []).map((n) => n.toLowerCase())))
    .catch(() => {
      listPromise = null; // let the next panel try again
      return new Set<string>();
    });
  return listPromise;
}

const MLD = new Set(MASS_LAND_DENIAL.map((n) => n.toLowerCase()));
const TURNS = new Set(EXTRA_TURNS.map((n) => n.toLowerCase()));

// Double-faced cards can be saved as "Front // Back" or just "Front"; match either.
function inList(name: string, list: Set<string>): boolean {
  const n = name.toLowerCase();
  return list.has(n) || list.has(n.split(" // ")[0]) || [...list].some((g) => g.split(" // ")[0] === n);
}

// The lowest bracket the deck can sit in by Wizards' rules, from the three things we check:
// extra turns rule out Bracket 1, 1-3 Game Changers mean Bracket 3, more than 3 or any mass
// land denial mean Bracket 4. Combos and tutors can still push it higher.
function estimate(gc: number, mld: number, turns: number): { badge: string; text: string } {
  if (mld > 0) return { badge: "4+", text: "Mass land denial isn't allowed below Bracket 4." };
  if (gc > 3) return { badge: "4+", text: `${gc} Game Changers: Bracket 3 allows up to 3.` };
  if (gc > 0) return { badge: "3", text: `${gc} Game Changer${gc === 1 ? "" : "s"}: that's Bracket 3 territory.` };
  if (turns > 0) return { badge: "2", text: "Extra turns rule out Bracket 1. Chaining them pushes the deck to Bracket 4." };
  return { badge: "1-2", text: "Nothing restricted found: Bracket 1 or 2, if the rest of the deck is that casual too." };
}

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
    loadList().then((l) => live && setList(l));
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
