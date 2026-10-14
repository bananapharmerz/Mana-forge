import "server-only";
import { searchCards, type ScryfallCard, ScryfallBusyError } from "./scryfall";

const SCRYFALL_API = process.env.SCRYFALL_API_URL || "https://api.scryfall.com";

export type PackRarity = "common" | "uncommon" | "rare" | "mythic";

export interface BoosterSet {
  code: string;
  name: string;
  released_at?: string;
  card_count: number;
  icon_svg_uri: string;
  set_type: string;
}

export interface PackCard {
  id: string;
  name: string;
  image?: string;
  backImage?: string;
  rarity: PackRarity;
  foil: boolean;
  setName: string;
  collectorNumber?: string;
  priceUsd: number | null;
  scryfallUri: string;
}

// Sets that shipped as draftable booster products — the ones it makes sense to "rip".
const BOOSTER_SET_TYPES = new Set(["core", "expansion", "draft_innovation", "masters"]);

export async function getBoosterSets(): Promise<BoosterSet[]> {
  const res = await fetch(`${SCRYFALL_API}/sets`, {
    headers: { "User-Agent": "mtg-hub/1.0", Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return [];
  const json = await res.json();
  const sets: BoosterSet[] = json.data ?? [];
  const now = Date.now();
  return sets
    .filter(
      (s) =>
        BOOSTER_SET_TYPES.has(s.set_type) &&
        s.card_count >= 100 &&
        s.released_at &&
        new Date(s.released_at).getTime() <= now
    )
    .map((s) => ({
      code: s.code,
      name: s.name,
      released_at: s.released_at,
      card_count: s.card_count,
      icon_svg_uri: s.icon_svg_uri,
      set_type: s.set_type,
    }))
    .sort((a, b) => (b.released_at ?? "").localeCompare(a.released_at ?? ""));
}

// A set's full card pool, grouped by rarity, cached in memory so repeated rips of the same set
// don't re-hit Scryfall. Showcase/borderless reprints collapse to one entry (unique=cards);
// basic lands and extras are excluded so commons stay interesting.
interface SetPool {
  at: number;
  name: string;
  byRarity: Record<PackRarity, ScryfallCard[]>;
}
const POOL_TTL = 12 * 60 * 60 * 1000;
const pools = ((globalThis as unknown as { __mfPackPools?: Map<string, SetPool> }).__mfPackPools ??= new Map());

async function getSetPool(code: string): Promise<SetPool> {
  const key = code.toLowerCase();
  const cached = pools.get(key);
  if (cached && Date.now() - cached.at < POOL_TTL) return cached;

  const byRarity: Record<PackRarity, ScryfallCard[]> = { common: [], uncommon: [], rare: [], mythic: [] };
  let name = code.toUpperCase();
  let page = 1;
  for (; page <= 6; page++) {
    const resp = await searchCards(`set:${key} game:paper -t:"basic land" -is:extra`, {
      unique: "cards",
      order: "set",
      dir: "asc",
      page,
    });
    for (const card of resp.data) {
      if (card.set_name) name = card.set_name;
      const r = card.rarity;
      if (r === "common" || r === "uncommon" || r === "rare" || r === "mythic") byRarity[r].push(card);
    }
    if (!resp.has_more) break;
  }
  const pool: SetPool = { at: Date.now(), name, byRarity };
  pools.set(key, pool);
  return pool;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Draw n distinct cards from a pool; falls back to allowing repeats if the pool is smaller than n.
function drawDistinct(pool: ScryfallCard[], n: number): ScryfallCard[] {
  if (pool.length === 0) return [];
  if (pool.length <= n) return [...pool];
  const idx = new Set<number>();
  while (idx.size < n) idx.add(Math.floor(Math.random() * pool.length));
  return [...idx].map((i) => pool[i]);
}

function priceOf(card: ScryfallCard, foil: boolean): number | null {
  const raw = foil
    ? card.prices?.usd_foil ?? card.prices?.usd_etched ?? card.prices?.usd
    : card.prices?.usd ?? card.prices?.usd_foil;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function toPackCard(card: ScryfallCard, rarity: PackRarity, foil: boolean, setName: string): PackCard {
  const front = card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;
  const back = card.image_uris ? undefined : card.card_faces?.[1]?.image_uris?.normal;
  return {
    id: `${card.id}${foil ? "-f" : ""}`,
    name: card.name,
    image: front,
    backImage: back,
    rarity,
    foil,
    setName,
    collectorNumber: card.collector_number,
    priceUsd: priceOf(card, foil),
    scryfallUri: card.scryfall_uri,
  };
}

export interface OpenedPack {
  setCode: string;
  setName: string;
  cards: PackCard[]; // ordered commons -> uncommons -> rare/mythic (the hit is last)
}

/**
 * Build one ~15-card pack from a set's pool with an approximation of real booster odds:
 * 10 commons, 3 uncommons, 1 rare-or-mythic (mythic ~1/8 of that slot), plus 1 foil of any
 * rarity. The order returned builds to the rare/mythic so the reveal has a payoff.
 */
export async function openPack(code: string): Promise<OpenedPack> {
  const pool = await getSetPool(code);
  const { common, uncommon, rare, mythic } = pool.byRarity;
  const total = common.length + uncommon.length + rare.length + mythic.length;
  if (total === 0) throw new ScryfallBusyError("No cards found for that set yet — try another.");

  const cards: PackCard[] = [];
  // 10 commons (fall back to uncommons if a set has few/no commons, e.g. some masters sets)
  const commonPool = common.length ? common : uncommon.length ? uncommon : rare;
  for (const c of drawDistinct(commonPool, Math.min(10, Math.max(4, commonPool.length)))) {
    cards.push(toPackCard(c, (c.rarity as PackRarity) ?? "common", false, pool.name));
  }
  // 3 uncommons
  const uncommonPool = uncommon.length ? uncommon : common;
  for (const c of drawDistinct(uncommonPool, 3)) {
    cards.push(toPackCard(c, (c.rarity as PackRarity) ?? "uncommon", false, pool.name));
  }
  // 1 foil of any rarity — weighted toward lower rarities, like a real foil slot
  const foilRoll = Math.random();
  const foilPool =
    foilRoll < 0.6 && common.length ? common
    : foilRoll < 0.9 && uncommon.length ? uncommon
    : mythic.length && Math.random() < 0.15 ? mythic
    : rare.length ? rare
    : common.length ? common : uncommon;
  if (foilPool.length) {
    const c = pick(foilPool);
    cards.push(toPackCard(c, (c.rarity as PackRarity) ?? "common", true, pool.name));
  }
  // 1 rare or mythic — the headliner, pushed last
  const mythicHit = mythic.length > 0 && Math.random() < 1 / 8;
  const rarePool = mythicHit ? mythic : rare.length ? rare : mythic;
  if (rarePool.length) {
    const c = pick(rarePool);
    cards.push(toPackCard(c, (c.rarity as PackRarity) ?? "rare", false, pool.name));
  }

  // Order: commons, then uncommons, then the foil, then the rare/mythic last.
  const order: Record<PackRarity, number> = { common: 0, uncommon: 1, rare: 3, mythic: 4 };
  cards.sort((a, b) => {
    const ra = a.foil ? 2 : order[a.rarity];
    const rb = b.foil ? 2 : order[b.rarity];
    return ra - rb;
  });

  return { setCode: code, setName: pool.name, cards };
}
