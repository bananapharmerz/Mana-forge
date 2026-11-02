import { EXTRA_TURNS, MASS_LAND_DENIAL } from "@/lib/bracketLists";

// The bracket estimate, shared by the deck page's panel (in the browser) and the Rule 0 summary
// (on the server), so both always say the same thing.

const MLD = new Set(MASS_LAND_DENIAL.map((n) => n.toLowerCase()));
const TURNS = new Set(EXTRA_TURNS.map((n) => n.toLowerCase()));

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

// Which of the deck's cards are Game Changers, mass land denial or extra turns, plus the estimate.
// `gameChangers` holds lower-cased names from Wizards' list.
export function bracketCheck(cards: string[], gameChangers: Set<string>) {
  const unique = Array.from(new Set(cards)).sort();
  const gc = unique.filter((c) => inList(c, gameChangers));
  const mld = unique.filter((c) => inList(c, MLD));
  const turns = unique.filter((c) => inList(c, TURNS));
  return { gc, mld, turns, est: estimate(gc.length, mld.length, turns.length) };
}
