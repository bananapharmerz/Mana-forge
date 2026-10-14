import "server-only";
import {
  getEdhrecCommanderData,
  getMostPlayed,
  getCommanderCombos,
  type EdhrecCardView,
} from "./edhrec";
import { getCardsByNames, cardImage, cardPriceUsd, type ScryfallCard } from "./scryfall";
import { getGameChangers } from "./gameChangers";

// The Deck Doctor "build buddy": given a commander and the cards already in the deck, it
// surfaces (1) the missing half of a known combo the deck has started, and (2) high-play-rate
// cards the deck is missing — each with a plain reason. EDHREC + Scryfall data only, no LLM.

export interface AdvisorPick {
  name: string;
  imageUrl?: string;
  priceUsd: number | null;
  reason: string;
  playRatePct: number; // 0–100, how often this commander's decks run the card
  gameChanger: boolean;
}

export interface ComboSuggestion {
  add: string; // the missing piece to add
  partners: string[]; // pieces already in the deck
  imageUrl?: string;
  priceUsd: number | null;
  reason: string;
  gameChanger: boolean;
}

export interface DeckAdvice {
  commander: string;
  combos: ComboSuggestion[];
  synergy: AdvisorPick[];
}

export interface AdviseOptions {
  have: string[]; // card names already in the deck (commander added automatically)
  maxCardUsd?: number; // when set, only suggest cards at or below this price (unknown price kept)
}

const playRate = (c: EdhrecCardView) => (c.potential_decks > 0 ? c.num_decks / c.potential_decks : 0);
const norm = (s: string) => s.toLowerCase().trim();

export async function adviseDeck(commanderName: string, opts: AdviseOptions): Promise<DeckAdvice | null> {
  const data = await getEdhrecCommanderData(commanderName);
  if (!data) return null;

  const max = opts.maxCardUsd;
  const withinBudget = (price: number | null) => max == null || price == null || price <= max;

  // Everything already in the deck, plus the commander itself (always "in play" for combos).
  const have = new Set<string>([norm(commanderName), ...opts.have.map(norm)]);

  // --- Candidate synergy cards: most-played nonlands this deck doesn't have yet ---
  const mostPlayed = getMostPlayed(data, 150).filter((c) => !have.has(norm(c.name)));

  // --- Combo completions: combos where the deck has ≥1 piece and is missing 1–2 others ---
  const combos = getCommanderCombos(data);
  type PendingCombo = { add: string; partners: string[] };
  const pendingCombos: PendingCombo[] = [];
  const comboAddSeen = new Set<string>();
  for (const combo of combos) {
    const present = combo.pieces.filter((p) => have.has(norm(p)));
    const missing = combo.pieces.filter((p) => !have.has(norm(p)));
    if (present.length < 1 || missing.length < 1 || missing.length > 2) continue;
    for (const add of missing) {
      if (comboAddSeen.has(norm(add))) continue;
      comboAddSeen.add(norm(add));
      pendingCombos.push({ add, partners: present });
    }
  }

  // Resolve images + prices (and game-changer status) for everything we might show.
  const synergyNames = mostPlayed.slice(0, 40).map((c) => c.name);
  const comboNames = pendingCombos.map((c) => c.add);
  const [cards, gc] = await Promise.all([
    getCardsByNames(Array.from(new Set([...synergyNames, ...comboNames]))),
    getGameChangers(),
  ]);
  const byName = new Map<string, ScryfallCard>();
  for (const c of cards) byName.set(norm(c.name), c);
  const gameChangers = new Set(gc.names.map(norm));
  const isGC = (name: string) => gameChangers.has(norm(name));

  // Combo suggestions first — they're the most actionable.
  const comboSuggestions: ComboSuggestion[] = [];
  for (const pc of pendingCombos) {
    const card = byName.get(norm(pc.add));
    const price = card ? cardPriceUsd(card) : null;
    if (!withinBudget(price)) continue;
    const partnerLabel = pc.partners.slice(0, 2).join(" + ");
    comboSuggestions.push({
      add: pc.add,
      partners: pc.partners,
      imageUrl: card ? cardImage(card) : undefined,
      priceUsd: price,
      reason: `You run ${partnerLabel} — add ${pc.add} to complete the combo.`,
      gameChanger: isGC(pc.add),
    });
    if (comboSuggestions.length >= 6) break;
  }

  // Synergy picks: top play-rate cards not already in the deck.
  const comboAdds = new Set(comboSuggestions.map((c) => norm(c.add)));
  const synergy: AdvisorPick[] = [];
  const short = commanderName.split(",")[0];
  for (const cv of mostPlayed) {
    if (comboAdds.has(norm(cv.name))) continue; // don't duplicate a combo pick here
    const card = byName.get(norm(cv.name));
    const price = card ? cardPriceUsd(card) : null;
    if (!withinBudget(price)) continue;
    const pct = Math.round(playRate(cv) * 100);
    const reason =
      cv.synergy >= 0.3
        ? `High synergy · in ${pct}% of ${short} decks`
        : `Played in ${pct}% of ${short} decks`;
    synergy.push({
      name: cv.name,
      imageUrl: card ? cardImage(card) : undefined,
      priceUsd: price,
      reason,
      playRatePct: pct,
      gameChanger: isGC(cv.name),
    });
    if (synergy.length >= 12) break;
  }

  return { commander: commanderName, combos: comboSuggestions, synergy };
}
