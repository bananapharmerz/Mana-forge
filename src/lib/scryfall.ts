export type ScryfallColor = "W" | "U" | "B" | "R" | "G";

export interface ScryfallCard {
  id: string;
  oracle_id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  keywords?: string[];
  color_identity: ScryfallColor[];
  legalities: Record<string, string>;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    art_crop: string;
    border_crop: string;
  };
  card_faces?: Array<{
    name: string;
    type_line?: string;
    oracle_text?: string;
    power?: string;
    toughness?: string;
    artist?: string;
    image_uris?: ScryfallCard["image_uris"];
  }>;
  edhrec_rank?: number;
  scryfall_uri: string;
  set_name: string;
  artist?: string;
  prices?: {
    usd?: string | null;
    usd_foil?: string | null;
    usd_etched?: string | null;
    eur?: string | null;
    tix?: string | null;
  };
}

export function cardPriceUsd(card: ScryfallCard): number | null {
  const raw = card.prices?.usd ?? card.prices?.usd_foil;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

interface ScryfallSearchResponse {
  object: "list" | "error";
  total_cards?: number;
  has_more?: boolean;
  next_page?: string;
  data: ScryfallCard[];
  details?: string;
}

const SCRYFALL_API = process.env.SCRYFALL_API_URL || "https://api.scryfall.com"; // server-side override only for testing

// Scryfall allows about 10 requests a second and answers 429 ("too many requests") beyond that,
// sometimes for a while. Every request goes through this queue: at least 110ms apart, and on a
// 429 it waits (Retry-After, or 1s, 2s, 3s) and tries again without reusing a cached answer.
// A 429 must never turn into "this card doesn't exist" (that would 404 a real commander page).
export class ScryfallBusyError extends Error {}
const sq = globalThis as unknown as { __scryfallNext?: number };
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
export async function sfetch(url: string, init: RequestInit = {}): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const now = Date.now();
    const at = Math.max(now, sq.__scryfallNext ?? 0);
    sq.__scryfallNext = at + 110;
    if (at > now) await pause(at - now);
    // Every Scryfall call gives up after 20s unless the caller set its own limit, so a slow
    // Scryfall can't leave a page hanging.
    // A timeout comes back as a 504 (not retried), so callers' "Scryfall is busy" handling and
    // cached fallbacks apply instead of an unexpected crash.
    let res: Response;
    try {
      res = await fetch(url, init.signal ? init : { ...init, signal: AbortSignal.timeout(20000) });
    } catch (e) {
      if (!init.signal && e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) return new Response(null, { status: 504 });
      throw e;
    }
    if (res.status !== 429 && res.status < 500) return res;
    if (attempt >= 3) return res;
    const ra = Number(res.headers.get("retry-after"));
    const wait = Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 10000) : 1000 * (attempt + 1);
    sq.__scryfallNext = Math.max(sq.__scryfallNext ?? 0, Date.now() + wait);
    await pause(wait);
    const { next: _skip, ...rest } = init as RequestInit & { next?: unknown };
    void _skip;
    init = { ...rest, cache: "no-store" };
  }
}

export function cardImage(card: ScryfallCard): string | undefined {
  return (
    card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal
  );
}

export function cardArtist(card: ScryfallCard): string | undefined {
  return card.artist ?? card.card_faces?.[0]?.artist;
}

// Only true double-faced cards (transform, modal DFC, meld) have a separate back-face image to
// flip to — split/adventure/fuse cards also have `card_faces`, but both halves live on one
// combined image (`image_uris` is still present at the top level for those), so they're excluded.
export function cardBackImage(card: ScryfallCard): string | undefined {
  if (card.image_uris) return undefined;
  return card.card_faces?.[1]?.image_uris?.normal;
}

// Many tokens share the exact same name (e.g. a dozen different "Zombie" creature tokens with
// different power/toughness or abilities), so the name alone doesn't tell printings apart the
// way it does for ordinary singleton cards — this surfaces the actual game-text differences.
export function cardDistinguishingText(card: ScryfallCard): string | undefined {
  const face = card.image_uris ? card : card.card_faces?.[0];
  if (!face) return undefined;
  const pt = face.power !== undefined && face.toughness !== undefined ? `${face.power}/${face.toughness}` : undefined;
  const keywords = card.keywords && card.keywords.length > 0 ? card.keywords.join(", ") : undefined;
  const text = keywords ?? face.oracle_text;
  return [pt, text].filter(Boolean).join(" — ") || undefined;
}

export function cardImageForPrint(card: ScryfallCard): string | undefined {
  return (
    card.image_uris?.border_crop ??
    card.card_faces?.[0]?.image_uris?.border_crop ??
    cardImage(card)
  );
}

export async function searchCards(
  query: string,
  opts: { order?: string; dir?: "asc" | "desc"; page?: number; unique?: "cards" | "art" | "prints" } = {}
): Promise<ScryfallSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    order: opts.order ?? "edhrec",
    dir: opts.dir ?? "asc",
    page: String(opts.page ?? 1),
    unique: opts.unique ?? "cards",
  });

  const res = await sfetch(`${SCRYFALL_API}/cards/search?${params}`, {
    headers: { "User-Agent": "mtg-hub/1.0", Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (res.status === 404) {
    return { object: "list", data: [], has_more: false, total_cards: 0 };
  }

  if (!res.ok) {
    if (res.status === 429 || res.status >= 500) throw new ScryfallBusyError(`Scryfall is busy (${res.status})`);
    throw new Error(`Scryfall search failed: ${res.status}`);
  }

  return res.json();
}

export async function autocompleteCardNames(query: string): Promise<string[]> {
  if (!query.trim()) return [];
  const res = await sfetch(
    `${SCRYFALL_API}/cards/autocomplete?q=${encodeURIComponent(query)}`
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

export async function autocompleteCommanderNames(query: string): Promise<string[]> {
  if (!query.trim()) return [];
  const result = await searchCards(`is:commander name:/${query}/`, { page: 1 });
  return result.data.map((c) => c.name).slice(0, 20);
}

export async function autocompleteTokenNames(query: string): Promise<string[]> {
  if (!query.trim()) return [];
  const result = await searchCards(`t:token name:/${query}/`, { page: 1 });
  return result.data.map((c) => c.name).slice(0, 20);
}

export async function getCardsByNames(names: string[]): Promise<ScryfallCard[]> {
  if (names.length === 0) return [];
  // Scryfall takes 75 names per request; the batches go out together (a page of 250 cards is 4
  // requests, well inside Scryfall's ~10 requests a second) instead of one after another.
  const batches: string[][] = [];
  for (let i = 0; i < names.length; i += 75) batches.push(names.slice(i, i + 75));
  const parts = await Promise.all(
    batches.map(async (batch) => {
      try {
        const res = await sfetch(`${SCRYFALL_API}/cards/collection`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "mtg-hub/1.0",
          },
          body: JSON.stringify({ identifiers: batch.map((name) => ({ name })) }),
          next: { revalidate: 3600 },
        });
        if (!res.ok) return [];
        const json = await res.json();
        return (json.data ?? []) as ScryfallCard[];
      } catch {
        return [];
      }
    })
  );
  return parts.flat();
}

export async function getAllPrintings(name: string): Promise<ScryfallCard[]> {
  // Scryfall's search excludes tokens (and other "extras") by default, so a token name would
  // otherwise come back with zero printings here even though it's a real, findable card.
  const result = await searchCards(`!"${name}" include:extras`, {
    unique: "prints",
    order: "released",
    dir: "desc",
  });
  return result.data ?? [];
}

export interface ScryfallSet {
  code: string;
  name: string;
  set_type: string;
  released_at?: string;
  card_count: number;
  icon_svg_uri: string;
}

const EXCLUDED_SET_TYPES = new Set(["token", "memorabilia", "minigame"]);

export async function getCommanderSets(): Promise<ScryfallSet[]> {
  const res = await sfetch(`${SCRYFALL_API}/sets`, {
    headers: { "User-Agent": "mtg-hub/1.0", Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return [];
  const json = await res.json();
  const sets: ScryfallSet[] = json.data ?? [];
  return sets
    .filter((s) => s.card_count > 20 && !EXCLUDED_SET_TYPES.has(s.set_type) && s.released_at)
    .sort((a, b) => (b.released_at ?? "").localeCompare(a.released_at ?? ""));
}

// Cards we've already fetched, so a busy Scryfall can still be answered (at most 3000 kept).
const lastGood = ((globalThis as unknown as { __mfLastGood?: Map<string, ScryfallCard> }).__mfLastGood ??= new Map());

/** A commander from the in-memory index (src/lib/commanderIndex.ts, refreshed daily) by its full
 *  name, its front face ("Kolvori, God of Kinship" for "Kolvori, God of Kinship // The Ringhart
 *  Crest"), or a short name only one commander starts with ("Urabrask" if there were just one).
 *  `loaded` says whether the index is there at all. */
function fromCommanderIndex(name: string): { card: ScryfallCard | null; loaded: boolean } {
  const g = globalThis as unknown as { __mfCommanderCards?: Map<string, ScryfallCard>; __mfCommanderFronts?: { size: number; map: Map<string, ScryfallCard | null> } };
  const index = g.__mfCommanderCards;
  if (!index || index.size < 100) return { card: null, loaded: false };
  const key = name.toLowerCase().trim();
  const hit = index.get(key);
  if (hit) return { card: hit, loaded: true };
  // Front faces and short names, built once per index (null marks a short name two cards share).
  if (g.__mfCommanderFronts?.size !== index.size) {
    const map = new Map<string, ScryfallCard | null>();
    const add = (k: string, c: ScryfallCard) => map.set(k, map.has(k) && map.get(k) !== c ? null : c);
    for (const [full, c] of index) {
      const front = full.split(" // ")[0];
      if (front !== full) add(front, c);
      const short = front.split(",")[0];
      if (short !== front && short.length >= 4) add(short, c);
    }
    g.__mfCommanderFronts = { size: index.size, map };
  }
  return { card: g.__mfCommanderFronts.map.get(key) ?? null, loaded: true };
}

/**
 * `commanderOnly`: for commander pages. Once the index is loaded, a name that isn't a commander is
 * a plain "not found" without asking Scryfall. Search engines crawl odd /decks/<name> links, and
 * sending each of those to Scryfall is what got us rate-limited (429).
 */
export async function getCardByName(name: string, opts: { commanderOnly?: boolean } = {}): Promise<ScryfallCard | null> {
  const key = name.toLowerCase();
  const fromIndex = fromCommanderIndex(name);
  if (fromIndex.card) return fromIndex.card;
  if (opts.commanderOnly && fromIndex.loaded) return lastGood.get(key) ?? null;
  const res = await sfetch(
    `${SCRYFALL_API}/cards/named?exact=${encodeURIComponent(name)}`,
    { headers: { "User-Agent": "mtg-hub/1.0", Accept: "application/json" }, next: { revalidate: 3600 } }
  );
  if (res.ok) {
    const card = (await res.json()) as ScryfallCard;
    if (lastGood.size >= 3000) lastGood.delete(lastGood.keys().next().value!);
    lastGood.set(key, card);
    return card;
  }
  const stale = lastGood.get(key);
  if (stale && res.status !== 404) return stale;
  // Only a real "no such card" means null. Scryfall being busy is an error, so the page answers
  // "try again" instead of a cached "not found".
  if (res.status === 404 || res.status === 400) return null;
  throw new ScryfallBusyError(`Scryfall is busy (${res.status})`);
}
