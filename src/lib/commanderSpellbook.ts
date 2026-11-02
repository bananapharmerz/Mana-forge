import "server-only";

// Commander Spellbook's "find my combos" — given the commander(s) and the cards in a deck, it
// returns the combos the deck has *almost* assembled (missing a piece or two), across the whole
// combo database, not just the ones EDHREC lists for the commander. Each combo also says what it
// produces ("Infinite lifeloss", …), which makes a great reason to show the player.

const API = process.env.SPELLBOOK_API_URL || "https://backend.commanderspellbook.com/find-my-combos/";

export interface SpellbookCombo {
  missing: string[]; // card names the deck doesn't have yet
  have: string[]; // combo pieces already in the deck (may include the commander)
  produces: string[]; // what the combo does, e.g. ["Infinite lifeloss"]
}

interface SbUse {
  card?: { name?: unknown };
}
interface SbFeature {
  feature?: { name?: unknown };
}
interface SbVariant {
  uses?: SbUse[];
  produces?: SbFeature[];
}

const norm = (s: string) => s.toLowerCase().trim();

export async function findAlmostCombos(commanders: string[], cards: string[]): Promise<SpellbookCombo[]> {
  try {
    const body = {
      commanders: commanders.map((card) => ({ card, quantity: 1 })),
      main: cards.map((card) => ({ card, quantity: 1 })),
    };
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "mtg-hub/1.0" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: { almostIncluded?: SbVariant[] } };
    const have = new Set([...commanders, ...cards].map(norm));

    const out: SpellbookCombo[] = [];
    for (const variant of data?.results?.almostIncluded ?? []) {
      const uses = (variant.uses ?? [])
        .map((u) => (typeof u?.card?.name === "string" ? u.card.name : null))
        .filter((n): n is string => !!n);
      if (uses.length === 0) continue;
      const missing = uses.filter((n) => !have.has(norm(n)));
      const present = uses.filter((n) => have.has(norm(n)));
      if (missing.length < 1 || missing.length > 2 || present.length < 1) continue;
      const produces = (variant.produces ?? [])
        .map((p) => (typeof p?.feature?.name === "string" ? p.feature.name : null))
        .filter((n): n is string => !!n);
      out.push({ missing, have: present, produces });
    }
    return out;
  } catch {
    return [];
  }
}

export interface DeckCombo {
  cards: string[]; // every piece, all already in the deck
  produces: string[];
}

// The combos the deck already has all the pieces for (Spellbook's "included" list). Same call and
// same one-hour cache as above; used by the Rule 0 summary, which only runs when a player asks.
// Returns null when Spellbook can't be reached, so callers can tell "none" from "don't know".
export async function findDeckCombos(commanders: string[], cards: string[]): Promise<DeckCombo[] | null> {
  try {
    const body = {
      commanders: commanders.map((card) => ({ card, quantity: 1 })),
      main: cards.map((card) => ({ card, quantity: 1 })),
    };
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "mtg-hub/1.0" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: { included?: SbVariant[] } };
    if (!data?.results) return null;
    const out: DeckCombo[] = [];
    for (const variant of data?.results?.included ?? []) {
      const pieces = (variant.uses ?? [])
        .map((u) => (typeof u?.card?.name === "string" ? u.card.name : null))
        .filter((n): n is string => !!n);
      if (pieces.length === 0) continue;
      const produces = (variant.produces ?? [])
        .map((p) => (typeof p?.feature?.name === "string" ? p.feature.name : null))
        .filter((n): n is string => !!n);
      out.push({ cards: pieces, produces });
    }
    return out;
  } catch {
    return null;
  }
}
