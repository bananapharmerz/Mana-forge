"use client";

import { useEffect, useState } from "react";

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

// Double-faced cards can be saved as "Front // Back" or just "Front"; match either.
function isGameChanger(name: string, list: Set<string>): boolean {
  const n = name.toLowerCase();
  return list.has(n) || list.has(n.split(" // ")[0]) || [...list].some((g) => g.split(" // ")[0] === n);
}

function hint(count: number): string {
  if (count === 0) return "No Game Changers: fits Bracket 1 or 2, if the rest of the deck is that casual too.";
  if (count <= 3) return `${count} Game Changer${count === 1 ? "" : "s"}: that's Bracket 3 territory.`;
  return `${count} Game Changers: that puts it in Bracket 4 or 5.`;
}

// Which of the deck's cards are on Wizards' Game Changers list, and a rough bracket hint.
// It's a guide to start the "what bracket is your deck?" chat, not a rating.
export default function GameChangersPanel({ cards }: { cards: string[] }) {
  const [list, setList] = useState<Set<string> | null>(null);
  useEffect(() => {
    let live = true;
    loadList().then((l) => live && setList(l));
    return () => {
      live = false;
    };
  }, []);

  // Scryfall hasn't answered (or is down): show nothing rather than a wrong "0".
  if (!list || list.size === 0) return null;

  const found = Array.from(new Set(cards.filter((c) => isGameChanger(c, list)))).sort();
  return (
    <div className="card-frame mt-4 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Game Changers <span className="text-gold-bright">{found.length}</span>
      </h3>
      <p className="text-sm text-foreground">{hint(found.length)}</p>
      {found.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {found.map((n) => (
            <li key={n} className="truncate text-xs text-gold-bright">
              {n}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[10px] leading-snug text-muted">
        Guide only, not an official bracket. Brackets also weigh combos, extra turns and land destruction, which this
        doesn&apos;t check.{" "}
        <a href={BRACKETS_ARTICLE} target="_blank" rel="noopener noreferrer" className="underline hover:text-gold-bright">
          How brackets work
        </a>
      </p>
    </div>
  );
}
