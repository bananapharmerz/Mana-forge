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

// A combo the deck already has every piece of.
export interface CompleteCombo {
  pieces: string[];
  produces: string[];
  url: string; // the combo's page on Commander Spellbook (credit + the full steps)
}

interface SbUse {
  card?: { name?: unknown };
}
interface SbFeature {
  feature?: { name?: unknown };
}
interface SbVariant {
  id?: unknown;
  uses?: SbUse[];
  produces?: SbFeature[];
}
interface SbResults {
  included?: SbVariant[];
  almostIncluded?: SbVariant[];
}

const norm = (s: string) => s.toLowerCase().trim();
const usesOf = (v: SbVariant) =>
  (v.uses ?? []).map((u) => (typeof u?.card?.name === "string" ? u.card.name : null)).filter((n): n is string => !!n);
const producesOf = (v: SbVariant) =>
  (v.produces ?? []).map((p) => (typeof p?.feature?.name === "string" ? p.feature.name : null)).filter((n): n is string => !!n);

// One call answers both questions (complete and almost-complete combos). The fetch cache keeps the
// same deck from asking Spellbook again for an hour, so the deck page and the advisor share it.
async function findMyCombos(commanders: string[], cards: string[], timeoutMs: number): Promise<SbResults | null> {
  const body = {
    commanders: commanders.map((card) => ({ card, quantity: 1 })),
    main: cards.map((card) => ({ card, quantity: 1 })),
  };
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "mtg-hub/1.0" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: SbResults };
  return data?.results ?? null;
}

export async function findAlmostCombos(commanders: string[], cards: string[]): Promise<SpellbookCombo[]> {
  try {
    const results = await findMyCombos(commanders, cards, 8000);
    const have = new Set([...commanders, ...cards].map(norm));

    const out: SpellbookCombo[] = [];
    for (const variant of results?.almostIncluded ?? []) {
      const uses = usesOf(variant);
      if (uses.length === 0) continue;
      const missing = uses.filter((n) => !have.has(norm(n)));
      const present = uses.filter((n) => have.has(norm(n)));
      if (missing.length < 1 || missing.length > 2 || present.length < 1) continue;
      out.push({ missing, have: present, produces: producesOf(variant) });
    }
    return out;
  } catch {
    return [];
  }
}

// The combos a deck already contains in full. Shown on public decks so players can see (and be
// honest about) what their list can do. Short timeout: this sits on a page, so a slow Spellbook
// just means no box, never a slow deck page.
export async function findCombos(commanders: string[], cards: string[], limit = 8): Promise<CompleteCombo[]> {
  try {
    const results = await findMyCombos(commanders, cards, 4000);
    const out: CompleteCombo[] = [];
    for (const variant of results?.included ?? []) {
      const pieces = usesOf(variant);
      const produces = producesOf(variant);
      if (pieces.length === 0 || produces.length === 0) continue;
      const id = typeof variant.id === "string" ? variant.id : null;
      const url = id ? `https://commanderspellbook.com/combo/${encodeURIComponent(id)}/` : "https://commanderspellbook.com/";
      out.push({ pieces, produces, url });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}
