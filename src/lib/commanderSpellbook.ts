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
