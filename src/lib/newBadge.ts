import type { ScryfallCard } from "./scryfall";

// The 'New' pill on the commanders grid only works if it's rare: when most cards wear a badge,
// people stop seeing it. So it never goes on more than 1 card in 10 of what's on screen.
const MAX_SHARE = 0.1;

// A commander is new when this is its first printing and that printing is in one of the newest sets.
// Reprints of old favourites in a new Commander deck don't count.
export function isNewCommander(card: ScryfallCard, setCodes: string[]): boolean {
  return card.reprint === false && !!card.set && setCodes.includes(card.set);
}

// Which of the newest sets (newest first) get the badge for this list of cards: both if that
// stays under 1 in 10, otherwise only the newest, otherwise none (e.g. a page filtered to the new set).
export function badgeSetCodes(cards: ScryfallCard[], newestSetCodes: string[]): string[] {
  for (const n of [2, 1]) {
    const codes = newestSetCodes.slice(0, n);
    if (codes.length === 0) continue;
    const count = cards.filter((c) => isNewCommander(c, codes)).length;
    if (count > 0 && count <= cards.length * MAX_SHARE) return codes;
  }
  return [];
}
