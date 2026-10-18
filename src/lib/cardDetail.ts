import { cardImage, cardBackImage, type ScryfallCard } from "@/lib/scryfall";

// The compact card info the detail popup shows, so the whole raw Scryfall card doesn't have to
// cross to the browser. Built server-side (commander page tiles) or fetched by name (/api/card,
// used by the deck builder where only names are on hand).

export interface CardFaceDetail {
  name: string;
  typeLine?: string;
  oracle?: string;
}

export interface CardDetail {
  name: string;
  typeLine: string;
  manaCost?: string;
  frontImg?: string;
  backImg?: string; // only set for true double-faced cards (transform / MDFC / battle) → enables flip
  oracle?: string;
  faces?: CardFaceDetail[];
  priceUsd?: string | null;
  priceEur?: string | null;
  scryfallUri?: string;
}

export interface CardStats {
  pctDecks?: number; // 0–100, "% of decks"
  synergy?: number; // synergy as a fraction, e.g. 0.17
  numDecks?: number;
}

export function cardDetailFromScryfall(card: ScryfallCard): CardDetail {
  return {
    name: card.name,
    typeLine: card.type_line,
    manaCost: card.mana_cost,
    frontImg: cardImage(card),
    backImg: cardBackImage(card),
    oracle: card.oracle_text,
    faces: card.card_faces?.map((f) => ({ name: f.name, typeLine: f.type_line, oracle: f.oracle_text })),
    priceUsd: card.prices?.usd ?? card.prices?.usd_foil ?? null,
    priceEur: card.prices?.eur ?? null,
    scryfallUri: card.scryfall_uri,
  };
}
