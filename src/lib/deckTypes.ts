export interface DeckCard {
  name: string;
  scryfallId: string;
  imageUrl?: string;
  backImageUrl?: string;
  typeLine: string;
  manaCost?: string;
  cmc: number;
  colorIdentity: string[];
  quantity: number;
  category: string;
  priceUsd?: number | null;
}

// Minimal shape needed from a Scryfall card to build a DeckCard — kept as a structural type
// (rather than importing ScryfallCard directly) so this file has no dependency on scryfall.ts.
interface ScryfallCardLike {
  id: string;
  name: string;
  type_line: string;
  mana_cost?: string;
  cmc: number;
  color_identity: string[];
  image_uris?: { normal: string };
  card_faces?: Array<{ image_uris?: { normal: string } }>;
  prices?: { usd?: string | null; usd_foil?: string | null };
}

// A true double-faced card (transform, modal DFC, meld) omits the top-level `image_uris` in
// favor of one full image per face — split/adventure/fuse cards keep a single combined image at
// the top level even though they also have `card_faces`, so they're excluded from "flippable".
function backImageFor(card: ScryfallCardLike): string | undefined {
  if (card.image_uris) return undefined;
  return card.card_faces?.[1]?.image_uris?.normal;
}

export function scryfallCardToDeckCard(card: ScryfallCardLike, quantity = 1): DeckCard {
  const imageUrl = card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;
  const rawPrice = card.prices?.usd ?? card.prices?.usd_foil;
  const parsedPrice = rawPrice ? Number(rawPrice) : null;

  return {
    name: card.name,
    scryfallId: card.id,
    imageUrl,
    backImageUrl: backImageFor(card),
    typeLine: card.type_line,
    manaCost: card.mana_cost,
    cmc: card.cmc,
    colorIdentity: card.color_identity,
    quantity,
    category: defaultCategory(card.type_line),
    priceUsd: parsedPrice !== null && Number.isFinite(parsedPrice) ? parsedPrice : null,
  };
}

export interface Deck {
  id: string;
  name: string;
  commander?: DeckCard;
  // A deck has at most one of these. Partner is a second commander (counts toward the 100-card
  // total, like the main commander). Companion sits alongside the commander in the command zone
  // but — matching the real rule — isn't part of the 100-card deck itself.
  partner?: DeckCard;
  companion?: DeckCard;
  cards: DeckCard[];
  cardBackUrl?: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// Just the fields deckPrice/typeBreakdown/deckSize actually need, so callers that only have
// a commander + card list (not a full saved Deck) can reuse them too.
export type CardPool = Pick<Deck, "commander" | "partner" | "companion" | "cards">;

const CATEGORY_RULES: [string, RegExp][] = [
  ["Tokens", /token/i],
  ["Creatures", /creature/i],
  ["Planeswalkers", /planeswalker/i],
  ["Battles", /battle/i],
  ["Instants", /instant/i],
  ["Sorceries", /sorcery/i],
  ["Artifacts", /artifact/i],
  ["Enchantments", /enchantment/i],
  ["Lands", /land/i],
];

export function defaultCategory(typeLine: string): string {
  for (const [label, re] of CATEGORY_RULES) {
    if (re.test(typeLine)) return label;
  }
  return "Other";
}

export const CATEGORY_ORDER = [
  "Creatures",
  "Planeswalkers",
  "Battles",
  "Instants",
  "Sorceries",
  "Artifacts",
  "Enchantments",
  "Lands",
  "Tokens",
  "Other",
];

// Tokens are free extras a deck can generate (copies, treasure, etc.) — they don't count
// against the singleton 100-card limit, so they're excluded from the size total here.
export function deckSize(deck: Deck): number {
  return (
    deck.cards.reduce((sum, c) => (c.category === "Tokens" ? sum : sum + c.quantity), 0) +
    (deck.commander ? 1 : 0) +
    (deck.partner ? 1 : 0)
  );
}

export interface DeckPrice {
  totalUsd: number;
  missingPriceCount: number;
}

export function deckPrice(deck: CardPool): DeckPrice {
  const extras = [deck.commander, deck.partner, deck.companion].filter(
    (c): c is DeckCard => !!c
  );
  const all = [...extras, ...deck.cards];
  let totalUsd = 0;
  let missingPriceCount = 0;
  for (const c of all) {
    if (typeof c.priceUsd === "number") {
      totalUsd += c.priceUsd * c.quantity;
    } else {
      missingPriceCount += c.quantity;
    }
  }
  return { totalUsd, missingPriceCount };
}

export function decklistText(deck: Deck): string {
  const lines: string[] = [];
  if (deck.commander) lines.push(`1 ${deck.commander.name}`);
  if (deck.partner) lines.push(`1 ${deck.partner.name}`);
  if (deck.companion) lines.push(`1 ${deck.companion.name}`);
  for (const c of deck.cards) lines.push(`${c.quantity} ${c.name}`);
  return lines.join("\n");
}

// Lowercase singular keys matching EDHREC's own type-count field names, so both a live Deck
// and an EDHREC deck row can produce the same shape for TypeBreakdownBar.
const TYPE_KEY_RULES: [string, RegExp][] = [
  ["creature", /creature/i],
  ["planeswalker", /planeswalker/i],
  ["instant", /instant/i],
  ["sorcery", /sorcery/i],
  ["artifact", /artifact/i],
  ["enchantment", /enchantment/i],
  ["land", /land/i],
];

export function typeBreakdown(deck: CardPool): Record<string, number> {
  const counts: Record<string, number> = {};
  const extras = [deck.commander, deck.partner, deck.companion].filter(
    (c): c is DeckCard => !!c
  );
  const all = [...extras, ...deck.cards];
  for (const c of all) {
    for (const [key, re] of TYPE_KEY_RULES) {
      if (re.test(c.typeLine)) {
        counts[key] = (counts[key] ?? 0) + c.quantity;
        break;
      }
    }
  }
  return counts;
}

export function manaCurve(deck: Deck): { cmc: string; count: number }[] {
  const buckets = new Map<number, number>();
  for (const c of deck.cards) {
    if (/land/i.test(c.typeLine) || c.category === "Tokens") continue;
    const bucket = Math.min(c.cmc, 7);
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + c.quantity);
  }
  return Array.from({ length: 8 }, (_, i) => ({
    cmc: i === 7 ? "7+" : String(i),
    count: buckets.get(i) ?? 0,
  }));
}
