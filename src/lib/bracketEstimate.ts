import { EXTRA_TURNS, MASS_LAND_DENIAL } from "@/lib/bracketLists";

// Mana Forge's own, unofficial bracket estimate, shared by the deck builder's panel and the play
// rooms. It only checks Game Changers, mass land denial and extra turns, so it's a hint for
// "does my deck fit this table?", never a Wizards rating.

// One request per page view at most, shared by everything on the page that needs the list.
let listPromise: Promise<Set<string>> | null = null;
export function loadGameChangers(): Promise<Set<string>> {
  listPromise ??= fetch("/api/game-changers")
    .then((r) => (r.ok ? r.json() : { names: [] }))
    .then((j: { names?: string[] }) => new Set((j.names ?? []).map((n) => n.toLowerCase())))
    .catch(() => {
      listPromise = null; // let the next caller try again
      return new Set<string>();
    });
  return listPromise;
}

export const MLD = new Set(MASS_LAND_DENIAL.map((n) => n.toLowerCase()));
export const TURNS = new Set(EXTRA_TURNS.map((n) => n.toLowerCase()));

// Double-faced cards can be saved as "Front // Back" or just "Front"; match either.
export function inList(name: string, list: Set<string>): boolean {
  const n = name.toLowerCase();
  return list.has(n) || list.has(n.split(" // ")[0]) || [...list].some((g) => g.split(" // ")[0] === n);
}

export type BracketBadge = "1-2" | "2" | "3" | "4+";

// The lowest bracket the deck can sit in by Wizards' rules, from the three things we check:
// extra turns rule out Bracket 1, 1-3 Game Changers mean Bracket 3, more than 3 or any mass
// land denial mean Bracket 4. Combos and tutors can still push it higher.
export function estimate(gc: number, mld: number, turns: number): { badge: BracketBadge; text: string } {
  if (mld > 0) return { badge: "4+", text: "Mass land denial isn't allowed below Bracket 4." };
  if (gc > 3) return { badge: "4+", text: `${gc} Game Changers: Bracket 3 allows up to 3.` };
  if (gc > 0) return { badge: "3", text: `${gc} Game Changer${gc === 1 ? "" : "s"}: that's Bracket 3 territory.` };
  if (turns > 0) return { badge: "2", text: "Extra turns rule out Bracket 1. Chaining them pushes the deck to Bracket 4." };
  return { badge: "1-2", text: "Nothing restricted found: Bracket 1 or 2, if the rest of the deck is that casual too." };
}

/** The estimate for a whole list of card names (duplicates are fine). */
export function estimateDeck(cards: string[], gameChangers: Set<string>) {
  const unique = Array.from(new Set(cards));
  return estimate(
    unique.filter((c) => inList(c, gameChangers)).length,
    unique.filter((c) => inList(c, MLD)).length,
    unique.filter((c) => inList(c, TURNS)).length,
  );
}

// What a play room can ask for. "any" is the default: most tables don't mind.
export const ROOM_BRACKETS = ["any", "1-2", "3", "4+"] as const;
export type RoomBracket = (typeof ROOM_BRACKETS)[number];
export const isRoomBracket = (v: unknown): v is RoomBracket => typeof v === "string" && (ROOM_BRACKETS as readonly string[]).includes(v);
export const roomBracketLabel = (b: RoomBracket | undefined) => (!b || b === "any" ? "Any bracket" : `Bracket ${b}`);

/** True when the deck's estimate sits above what the table asked for (a hint, never a block). */
export function aboveTable(deck: BracketBadge, table: RoomBracket | undefined): boolean {
  if (!table || table === "any") return false;
  const rank = (b: string) => (b === "4+" ? 4 : b === "3" ? 3 : 2); // "1-2" and "2" both fit a 1-2 table
  return rank(deck) > rank(table);
}
