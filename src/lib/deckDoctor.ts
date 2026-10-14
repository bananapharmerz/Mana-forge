import "server-only";
import { getEdhrecCommanderData, getTypeSections, type EdhrecCardView } from "./edhrec";
import { getCardsByNames, cardImage, cardPriceUsd, type ScryfallCard } from "./scryfall";
import { defaultCategory, type DeckCard } from "./deckTypes";

// The Deck Doctor "Brew": builds a strong, plausible 100-card Commander deck for a commander by
// picking the cards the community actually plays with it most (EDHREC play rate), hitting a
// sensible type split and land count — no LLM, no API key, just EDHREC + Scryfall data. With a
// budget it builds the ideal list first, then trims the most expensive cards down to cheaper
// high-play-rate cards (and basic lands) until the total fits.

export interface BuiltDeck {
  commander: DeckCard;
  cards: DeckCard[];
  meta: {
    totalUsd: number;
    landCount: number;
    nonlandCount: number;
    budgetUsd?: number;
    notes: string[];
  };
}

export interface BrewOptions {
  budgetUsd?: number; // total deck budget (excludes commander); undefined = no cap
}

const BASIC_BY_COLOR: Record<string, string> = { W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest" };
const BASIC_NAMES = new Set([...Object.values(BASIC_BY_COLOR), "Wastes"]);

type Cat = "creature" | "instant" | "sorcery" | "artifact" | "enchantment" | "planeswalker" | "land";
const SECTION_TO_CAT: Record<string, Cat> = {
  creatures: "creature",
  instants: "instant",
  sorceries: "sorcery",
  utilityartifacts: "artifact",
  manaartifacts: "artifact",
  enchantments: "enchantment",
  planeswalkers: "planeswalker",
  utilitylands: "land",
  lands: "land",
};
const NONLAND_CATS: Cat[] = ["creature", "instant", "sorcery", "artifact", "enchantment", "planeswalker"];
// Deck-category label (DeckCard.category) back to our EDHREC category, for budget trimming.
const LABEL_TO_CAT: Record<string, Cat> = {
  Creatures: "creature",
  Instants: "instant",
  Sorceries: "sorcery",
  Artifacts: "artifact",
  Enchantments: "enchantment",
  Planeswalkers: "planeswalker",
  Lands: "land",
};

function playRate(c: EdhrecCardView): number {
  return c.potential_decks > 0 ? c.num_decks / c.potential_decks : 0;
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

export async function brewDeck(commanderName: string, opts: BrewOptions = {}): Promise<BuiltDeck | null> {
  const data = await getEdhrecCommanderData(commanderName);
  if (!data) return null;
  const budget = opts.budgetUsd;

  // Ranked candidate names per category (by play rate, best first), de-duped across sections.
  const ranked: Record<Cat, { name: string; rate: number }[]> = {
    creature: [], instant: [], sorcery: [], artifact: [], enchantment: [], planeswalker: [], land: [],
  };
  const seen = new Set<string>();
  for (const section of getTypeSections(data)) {
    const cat = SECTION_TO_CAT[section.tag];
    if (!cat) continue;
    for (const cv of section.cardviews) {
      if (seen.has(cv.name) || BASIC_NAMES.has(cv.name)) continue;
      seen.add(cv.name);
      ranked[cat].push({ name: cv.name, rate: playRate(cv) });
    }
  }
  for (const cat of Object.keys(ranked) as Cat[]) ranked[cat].sort((a, b) => b.rate - a.rate);

  // Target type split from EDHREC's average deck for this commander, normalised to 99 cards.
  const tc = data.typeCounts;
  const landTarget = clamp(tc.land || 37, 33, 40);
  const nonlandBudget = 99 - landTarget;
  const rawNonland = NONLAND_CATS.reduce((s, c) => s + Math.max(0, tc[c] ?? 0), 0) || 60;
  const targets: Record<Cat, number> = { creature: 0, instant: 0, sorcery: 0, artifact: 0, enchantment: 0, planeswalker: 0, land: landTarget };
  let assigned = 0;
  for (const cat of NONLAND_CATS) {
    const t = Math.round((Math.max(0, tc[cat] ?? 0) / rawNonland) * nonlandBudget);
    targets[cat] = t;
    assigned += t;
  }
  targets.creature += nonlandBudget - assigned; // soak rounding drift into creatures
  if (targets.creature < 0) targets.creature = 0;

  // Pull a generous top slice (deeper when budgeting, so cheap alternatives are available).
  const wantNames = new Set<string>([commanderName, ...Object.values(BASIC_BY_COLOR), "Wastes"]);
  for (const cat of Object.keys(ranked) as Cat[]) {
    const extra = budget !== undefined ? 55 : 18;
    const depth = cat === "land" ? landTarget + (budget !== undefined ? 50 : 25) : targets[cat] + extra;
    for (const c of ranked[cat].slice(0, depth)) wantNames.add(c.name);
  }

  const cardMap = new Map<string, ScryfallCard>();
  for (const c of await getCardsByNames(Array.from(wantNames))) cardMap.set(c.name, c);

  const commanderCard = cardMap.get(commanderName);
  if (!commanderCard || cardMap.size < 60) return null;

  const used = new Set<string>([commanderName]);
  const chosen: DeckCard[] = [];
  const price = (name: string) => cardPriceUsd(cardMap.get(name)!) ?? 0;
  const take = (name: string) => {
    used.add(name);
    chosen.push(toDeckCard(cardMap.get(name)!, 1));
  };

  // Ideal build: the top `target` real cards per category (same for budget — we trim afterward).
  for (const cat of [...NONLAND_CATS, "land" as Cat]) {
    let added = 0;
    const want = cat === "land" ? landTarget : targets[cat];
    for (const { name } of ranked[cat]) {
      if (added >= want) break;
      if (used.has(name) || !cardMap.has(name)) continue;
      take(name);
      added++;
    }
  }

  // Budget trim: repeatedly replace the most expensive non-basic card with the cheapest unused
  // card in the same category (a basic land, free, for land slots) until the total fits.
  if (budget !== undefined) {
    let spent = chosen.reduce((s, c) => s + (c.priceUsd ?? 0), 0);
    const cheapestUnused = (cat: Cat): string | null => {
      let best: string | null = null;
      let bestP = Infinity;
      for (const { name } of ranked[cat]) {
        if (used.has(name) || !cardMap.has(name)) continue;
        const p = price(name);
        if (p < bestP) { bestP = p; best = name; }
      }
      return best;
    };
    let guard = 0;
    while (spent > budget && guard++ < 400) {
      const nonBasic = chosen.filter((c) => !BASIC_NAMES.has(c.name));
      if (nonBasic.length === 0) break;
      nonBasic.sort((a, b) => (b.priceUsd ?? 0) - (a.priceUsd ?? 0));
      const worst = nonBasic[0];
      if ((worst.priceUsd ?? 0) <= 0) break; // nothing left worth trimming
      const i = chosen.indexOf(worst);
      chosen.splice(i, 1);
      used.delete(worst.name);
      spent -= worst.priceUsd ?? 0;
      const cat = LABEL_TO_CAT[worst.category];
      if (cat === "land" || !cat) {
        // land slot -> becomes a basic via the fill step below (leave the slot open)
        continue;
      }
      const repl = cheapestUnused(cat);
      if (repl && price(repl) < (worst.priceUsd ?? 0)) {
        take(repl);
        spent += price(repl);
      }
      // else: leave the slot open; the basics fill keeps the deck at 100 (rare for cheap commons)
    }
  }

  // Fill the rest with basic lands by colour identity (free).
  let shortfall = 99 - chosen.reduce((s, c) => s + c.quantity, 0);
  const colors = commanderCard.color_identity?.length ? commanderCard.color_identity : ["C"];
  let idx = 0;
  while (shortfall > 0 && idx <= 500) {
    const color = colors[idx % colors.length];
    const basicName = BASIC_BY_COLOR[color] ?? "Wastes";
    const basicCard = cardMap.get(basicName);
    if (basicCard) {
      const existing = chosen.find((c) => c.name === basicName);
      if (existing) existing.quantity += 1;
      else chosen.push(toDeckCard(basicCard, 1));
      shortfall -= 1;
    }
    idx += 1;
  }

  if (chosen.reduce((s, c) => s + c.quantity, 0) < 95) return null;

  const totalUsd = chosen.reduce((s, c) => s + (c.priceUsd ?? 0) * c.quantity, 0);
  const landCount = chosen.filter((c) => c.category === "Lands").reduce((s, c) => s + c.quantity, 0);
  const nonlandCount = chosen.reduce((s, c) => s + c.quantity, 0) - landCount;

  const notes: string[] = [`Built from the cards most played with ${commanderName} on EDHREC.`];
  if (budget !== undefined) notes.push(`Trimmed to roughly $${budget.toFixed(0)} by swapping the priciest cards for cheaper high-play-rate ones and basics.`);

  return {
    commander: toDeckCard(commanderCard, 1),
    cards: chosen,
    meta: { totalUsd, landCount, nonlandCount, budgetUsd: budget, notes },
  };
}
