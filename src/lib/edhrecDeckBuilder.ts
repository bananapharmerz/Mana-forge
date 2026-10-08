import { getEdhrecCommanderData, type EdhrecPublicDeck } from "./edhrec";
import { getCardsByNames, cardImage, cardPriceUsd, type ScryfallCard } from "./scryfall";
import { defaultCategory, type DeckCard } from "./deckTypes";

// EDHREC only gives us aggregate type counts per public deck (how many creatures, lands, etc),
// never the actual card names — so "saving" one of those decks means building a real, plausible
// decklist that matches those counts from the commander's real EDHREC card pool, the same
// technique the seed script uses to populate the site with real decks up front.

const SECTION_TAGS: Record<string, string[]> = {
  creature: ["creatures"],
  instant: ["instants"],
  sorcery: ["sorceries"],
  artifact: ["manaartifacts", "utilityartifacts"],
  enchantment: ["enchantments"],
  planeswalker: ["planeswalkers"],
  land: ["lands", "utilitylands"],
};

const BASIC_BY_COLOR: Record<string, string> = { W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest" };
const BASIC_NAMES = [...Object.values(BASIC_BY_COLOR), "Wastes"];

function namesFromTags(cardlists: { tag: string; cardviews: { name: string }[] }[], tags: string[]): string[] {
  const seen = new Set<string>();
  for (const tag of tags) {
    const list = cardlists.find((l) => l.tag === tag);
    if (!list) continue;
    for (const cv of list.cardviews) seen.add(cv.name);
  }
  return Array.from(seen);
}

function pickRandom<T>(pool: T[], count: number): T[] {
  const windowSize = Math.max(count * 3, 20);
  const window = pool.slice(0, Math.min(pool.length, windowSize));
  const shuffled = window.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function toDeckCard(card: ScryfallCard, quantity: number): DeckCard {
  return {
    name: card.name,
    scryfallId: card.id,
    imageUrl: cardImage(card),
    typeLine: card.type_line,
    manaCost: card.mana_cost,
    cmc: card.cmc,
    colorIdentity: card.color_identity ?? [],
    quantity,
    category: defaultCategory(card.type_line),
    priceUsd: cardPriceUsd(card),
  };
}

export interface BuiltDeck {
  commander: DeckCard;
  cards: DeckCard[];
}

// Builds one real, plausible 100-card decklist for `commanderName` whose type breakdown matches
// `targetCounts` (the specific EDHREC deck row being saved) as closely as possible. Returns null
// if EDHREC/Scryfall don't have enough data to make a believable deck.
export async function buildDeckFromEdhrec(
  commanderName: string,
  targetCounts: Pick<EdhrecPublicDeck, "creature" | "instant" | "sorcery" | "artifact" | "enchantment" | "planeswalker" | "land">
): Promise<BuiltDeck | null> {
  const data = await getEdhrecCommanderData(commanderName);
  if (!data) return null;

  const pools: Record<string, string[]> = {};
  const allNames = new Set<string>([commanderName, ...BASIC_NAMES]);
  for (const [cat, tags] of Object.entries(SECTION_TAGS)) {
    pools[cat] = namesFromTags(data.cardlists, tags);
    for (const n of pools[cat]) allNames.add(n);
  }

  const cardMap = new Map<string, ScryfallCard>();
  for (const c of await getCardsByNames(Array.from(allNames))) cardMap.set(c.name, c);

  const commanderCard = cardMap.get(commanderName);
  if (!commanderCard || cardMap.size < 60) return null;

  const nonlandCategories = ["creature", "instant", "sorcery", "artifact", "enchantment", "planeswalker"] as const;
  const rawTargets: Record<string, number> = {};
  for (const cat of nonlandCategories) rawTargets[cat] = Math.max(0, targetCounts[cat] ?? 0);
  const rawNonlandTotal = Object.values(rawTargets).reduce((a, b) => a + b, 0) || 60;

  const landTarget = clamp(targetCounts.land || 37, 33, 40);
  const nonlandBudget = 99 - landTarget;

  const targets: Record<string, number> = {};
  let assigned = 0;
  for (const cat of nonlandCategories) {
    const t = Math.round((rawTargets[cat] / rawNonlandTotal) * nonlandBudget);
    targets[cat] = t;
    assigned += t;
  }
  targets.creature += nonlandBudget - assigned;
  if (targets.creature < 0) targets.creature = 0;

  const chosen: DeckCard[] = [];
  const usedNames = new Set<string>([commanderName]);

  for (const cat of nonlandCategories) {
    const pool = (pools[cat] ?? []).filter((n) => cardMap.has(n) && !usedNames.has(n));
    for (const name of pickRandom(pool, targets[cat])) {
      usedNames.add(name);
      chosen.push(toDeckCard(cardMap.get(name)!, 1));
    }
  }

  const landPool = (pools.land ?? []).filter((n) => cardMap.has(n) && !usedNames.has(n));
  for (const name of pickRandom(landPool, landTarget)) {
    usedNames.add(name);
    chosen.push(toDeckCard(cardMap.get(name)!, 1));
  }

  let shortfall = 99 - chosen.reduce((s, c) => s + c.quantity, 0);
  if (shortfall > 0) {
    const colors = commanderCard.color_identity?.length ? commanderCard.color_identity : ["W"];
    let idx = 0;
    while (shortfall > 0) {
      const color = colors[idx % colors.length];
      const basicName = BASIC_BY_COLOR[color] ?? "Wastes";
      const basicCard = cardMap.get(basicName);
      if (basicCard) {
        const existing = chosen.find((c) => c.name === basicName);
        if (existing) existing.quantity += 1;
        else chosen.push(toDeckCard(basicCard, 1));
      }
      shortfall -= 1;
      idx += 1;
    }
  }

  if (chosen.length < 80) return null;

  return { commander: toDeckCard(commanderCard, 1), cards: chosen };
}
