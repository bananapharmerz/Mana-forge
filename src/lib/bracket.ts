import { EXTRA_TURNS, MASS_LAND_DENIAL } from "@/lib/bracketLists";

// Our own bracket estimate, shared by the Game Changers panel on the deck page and the small
// badge on deck rows, so both always say the same thing. It's an estimate, not Wizards' rating.

export const MLD = new Set(MASS_LAND_DENIAL.map((n) => n.toLowerCase()));
export const TURNS = new Set(EXTRA_TURNS.map((n) => n.toLowerCase()));

// Double-faced cards can be saved as "Front // Back" or just "Front"; match either.
export function inList(name: string, list: Set<string>): boolean {
  const n = name.toLowerCase();
  return list.has(n) || list.has(n.split(" // ")[0]) || [...list].some((g) => g.split(" // ")[0] === n);
}

// The lowest bracket the deck can sit in by Wizards' rules, from the three things we check:
// extra turns rule out Bracket 1, 1-3 Game Changers mean Bracket 3, more than 3 or any mass
// land denial mean Bracket 4. Combos and tutors can still push it higher.
export function estimate(gc: number, mld: number, turns: number): { badge: string; text: string } {
  if (mld > 0) return { badge: "4+", text: "Mass land denial isn't allowed below Bracket 4." };
  if (gc > 3) return { badge: "4+", text: `${gc} Game Changers: Bracket 3 allows up to 3.` };
  if (gc > 0) return { badge: "3", text: `${gc} Game Changer${gc === 1 ? "" : "s"}: that's Bracket 3 territory.` };
  if (turns > 0) return { badge: "2", text: "Extra turns rule out Bracket 1. Chaining them pushes the deck to Bracket 4." };
  return { badge: "1-2", text: "Nothing restricted found: Bracket 1 or 2, if the rest of the deck is that casual too." };
}

// Just the badge for a list of card names. Null when we don't have the Game Changers list: an
// empty list would make every deck look like Bracket 1-2, which is worse than no badge.
export function bracketBadge(names: string[], gameChangers: Set<string>): string | null {
  if (gameChangers.size === 0) return null;
  const unique = [...new Set(names)];
  const count = (list: Set<string>) => unique.filter((n) => inList(n, list)).length;
  return estimate(count(gameChangers), count(MLD), count(TURNS)).badge;
}

// Lower-cased Game Changers names, from a GameChangerList's names.
export function gameChangerSet(names: string[]): Set<string> {
  return new Set(names.map((n) => n.toLowerCase()));
}

// Browser only: one /api/game-changers request per page view, shared by every panel and badge.
let listPromise: Promise<Set<string>> | null = null;
export function loadGameChangerSet(): Promise<Set<string>> {
  listPromise ??= fetch("/api/game-changers")
    .then((r) => (r.ok ? r.json() : { names: [] }))
    .then((j: { names?: string[] }) => gameChangerSet(j.names ?? []))
    .catch(() => {
      listPromise = null; // let the next one try again
      return new Set<string>();
    });
  return listPromise;
}
