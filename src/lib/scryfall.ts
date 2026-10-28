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
  set?: string;
  rarity?: "common" | "uncommon" | "rare" | "mythic" | "special" | "bonus";
  collector_number?: string;
  lang?: string;
  full_art?: boolean;
  border_color?: string;
  frame_effects?: string[];
  promo_types?: string[];
  variation?: boolean;
  finishes?: string[];
  booster?: boolean;
  reprint?: boolean; // false on a card's first printing; the 'New' badge only marks first printings
  artist?: string;
  prices?: {
    usd?: string | null;
    usd_foil?: string | null;
    usd_etched?: string | null;
    eur?: string | null;
    tix?: string | null;
  };
}

// Scryfall sends dozens of fields per card (purchase links, related URIs, print details...) that
// nothing here reads. Lists of cards handed to the browser keep only what this type declares:
// for the commanders page that cuts the card data from about 950 KB to about 320 KB per 175 cards.
type CardFace = NonNullable<ScryfallCard["card_faces"]>[number];
type CardImages = NonNullable<ScryfallCard["image_uris"]>;
type CardPrices = NonNullable<ScryfallCard["prices"]>;
const CARD_KEYS: (keyof ScryfallCard)[] = [
  "id", "oracle_id", "name", "mana_cost", "cmc", "type_line", "oracle_text", "power", "toughness", "keywords",
  "color_identity", "legalities", "edhrec_rank", "scryfall_uri", "set_name", "artist",
  "set", "rarity", "collector_number", "finishes", "booster", "reprint",
];
const FACE_KEYS: (keyof CardFace)[] = ["name", "type_line", "oracle_text", "power", "toughness", "artist"];
const IMAGE_KEYS: (keyof CardImages)[] = ["small", "normal", "large", "art_crop", "border_crop"];
const PRICE_KEYS: (keyof CardPrices)[] = ["usd", "usd_foil", "usd_etched", "eur", "tix"];

function pickKeys<T extends object>(source: T, keys: (keyof T)[]): T {
  const out = {} as T;
  for (const k of keys) if (source[k] !== undefined) out[k] = source[k];
  return out;
}

export function slimCard(card: ScryfallCard): ScryfallCard {
  const out = pickKeys(card, CARD_KEYS);
  if (card.image_uris) out.image_uris = pickKeys(card.image_uris, IMAGE_KEYS);
  if (card.card_faces) {
    out.card_faces = card.card_faces.map((f) => {
      const face = pickKeys(f, FACE_KEYS);
      if (f.image_uris) face.image_uris = pickKeys(f.image_uris, IMAGE_KEYS);
      return face;
    });
  }
  if (card.prices) out.prices = pickKeys(card.prices, PRICE_KEYS);
  return out;
}

export function cardPriceUsd(card: ScryfallCard): number | null {
  const raw = card.prices?.usd ?? card.prices?.usd_foil;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface ScryfallSearchResponse {
  object: "list" | "error";
  total_cards?: number;
  has_more?: boolean;
  next_page?: string;
  data: ScryfallCard[];
  details?: string;
}

const SCRYFALL_API = process.env.SCRYFALL_API_URL || "https://api.scryfall.com"; // server-side override only for testing

// Scryfall allows about 10 requests a second and answers 429 ("too many requests") beyond that,
// sometimes for a while. Every request that reaches Scryfall goes through one queue: at least
// 110ms apart, visitors' requests ahead of background jobs (price refresh, commander index), and
// on a 429 it waits (Retry-After, or 1s, 2s, 3s) and tries again.
// A 429 must never turn into "this card doesn't exist" (that would 404 a real commander page).
//
// Answers asked for with `next: { revalidate }` are kept (see scryfallCache.ts) for that long and
// then served stale, instantly, while one background request refreshes them. Cached answers never
// wait in the queue, and identical requests in flight share one call.
export class ScryfallBusyError extends Error {}
// The cache uses the server's disk, and this file also runs in the browser (the art picker), so it
// isn't imported here: scryfallCache.ts registers itself on the server (instrumentation.ts, db.ts).
// Without it (the browser, scripts) requests simply aren't cached.
type SfStore = {
  cacheGet: (bucket: string, key: string) => Promise<{ body: string; at: number } | null>;
  cachePut: (bucket: string, key: string, body: string, at?: number) => void;
};
const STALE_LIMIT_MS = 30 * 86400_000; // same as scryfallCache.ts
const store = () => (globalThis as unknown as { __mfSfStore?: SfStore }).__mfSfStore;
const cacheGet = async (bucket: string, key: string) => (await store()?.cacheGet(bucket, key)) ?? null;
const cachePut = (bucket: string, key: string, body: string, at?: number) => store()?.cachePut(bucket, key, body, at);
type SfInit = RequestInit & { next?: { revalidate?: number | false }; priority?: "high" | "low" };
const sq = globalThis as unknown as {
  __scryfallNext?: number;
  __sfLanes?: { high: (() => void)[]; low: (() => void)[]; timer: ReturnType<typeof setTimeout> | null };
  __sfInflight?: Map<string, Promise<CachedAnswer>>;
};
const lanes = (sq.__sfLanes ??= { high: [], low: [], timer: null });
const inflight = (sq.__sfInflight ??= new Map());
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

function pump() {
  if (lanes.timer) return;
  const wait = Math.max(0, (sq.__scryfallNext ?? 0) - Date.now());
  lanes.timer = setTimeout(() => {
    lanes.timer = null;
    const go = lanes.high.shift() ?? lanes.low.shift();
    if (go) {
      sq.__scryfallNext = Date.now() + 110;
      go();
    }
    if (lanes.high.length || lanes.low.length) pump();
  }, wait);
}
function slot(priority: "high" | "low"): Promise<void> {
  return new Promise((resolve) => {
    lanes[priority].push(resolve);
    pump();
  });
}

async function sfetchLive(url: string, init: SfInit): Promise<Response> {
  const priority = init.priority ?? "high";
  const { priority: _p, ...base } = init;
  void _p;
  let req: RequestInit = base;
  for (let attempt = 0; ; attempt++) {
    await slot(priority);
    // Every Scryfall call gives up after 20s unless the caller set its own limit, so a slow
    // Scryfall can't leave a page hanging.
    // A timeout comes back as a 504 (not retried), so callers' "Scryfall is busy" handling and
    // cached fallbacks apply instead of an unexpected crash.
    let res: Response;
    try {
      res = await fetch(url, req.signal ? req : { ...req, signal: AbortSignal.timeout(20000) });
    } catch (e) {
      if (!req.signal && e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) return new Response(null, { status: 504 });
      throw e;
    }
    if (res.status !== 429 && res.status < 500) return res;
    if (attempt >= 3) return res;
    const ra = Number(res.headers.get("retry-after"));
    const wait = Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 10000) : 1000 * (attempt + 1);
    sq.__scryfallNext = Math.max(sq.__scryfallNext ?? 0, Date.now() + wait);
    await pause(wait);
    const { next: _skip, ...rest } = req as SfInit;
    void _skip;
    req = { ...rest, cache: "no-store" };
  }
}

interface CachedAnswer {
  status: number;
  body: string;
}

const answer = (a: CachedAnswer) =>
  new Response(a.status === 504 ? null : a.body, { status: a.status, headers: { "content-type": "application/json" } });

// One live call per key at a time; 200s are stored.
function refresh(key: string, url: string, init: SfInit): Promise<CachedAnswer> {
  let p = inflight.get(key);
  if (!p) {
    // The cache replaces Next's fetch cache here: no `next`/`cache` options on the real fetch, so
    // the call never marks an ISR page as dynamic.
    const { next: _n, cache: _c, ...req } = init;
    void _n;
    void _c;
    p = sfetchLive(url, req)
      .then(async (res) => {
        const body = res.status === 504 ? "" : await res.text();
        if (res.status === 200) cachePut("res", key, body);
        return { status: res.status, body };
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

export async function sfetch(url: string, init: SfInit = {}): Promise<Response> {
  const ttl = init.next?.revalidate;
  const cacheable = typeof ttl === "number" && ttl > 0 && init.cache !== "no-store" && !init.signal && !!store();
  if (!cacheable) return sfetchLive(url, init);

  const method = (init.method ?? "GET").toUpperCase();
  const key = `${method} ${url}${typeof init.body === "string" ? ` ${init.body}` : ""}`;
  const hit = await cacheGet("res", key);
  const age = hit ? Date.now() - hit.at : Infinity;
  if (hit && age < ttl * 1000) return answer({ status: 200, body: hit.body });
  if (hit && age < STALE_LIMIT_MS) {
    // Stale: answer now, refresh behind the visitor's back.
    void refresh(key, url, { ...init, priority: "low" }).catch(() => {});
    return answer({ status: 200, body: hit.body });
  }
  const live = await refresh(key, url, init);
  // Scryfall busy and only a very old copy: the old copy beats an error page.
  if (hit && (live.status === 429 || live.status >= 500)) return answer({ status: 200, body: hit.body });
  return answer(live);
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

// Card lookups (/cards/collection, 75 per request) are cached card by card rather than per
// request: the same staples appear on thousands of pages, so a commander page usually only has to
// ask Scryfall for the handful of cards no page has needed yet. Fresh for 6 hours (Scryfall moves
// prices once a day), then shown as-is while a background request updates them.
const CARD_FRESH_MS = 6 * 3600_000;
type CardKind = "name" | "id";
const cardKey = (kind: CardKind, v: string) => `${kind}:${kind === "name" ? v.toLowerCase().trim() : v}`;

async function fetchCollection(kind: CardKind, batch: string[], priority: "high" | "low"): Promise<void> {
  const res = await sfetchLive(`${SCRYFALL_API}/cards/collection`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "mtg-hub/1.0" },
    body: JSON.stringify({ identifiers: batch.map((v) => (kind === "name" ? { name: v } : { id: v })) }),
    priority,
  });
  if (!res.ok) return;
  const json = (await res.json()) as { data?: ScryfallCard[]; not_found?: { name?: string; id?: string }[] };
  const found = json.data ?? [];
  const lookup = new Map<string, ScryfallCard>();
  for (const c of found) {
    if (kind === "id") lookup.set(c.id, c);
    else {
      lookup.set(c.name.toLowerCase(), c);
      for (const f of c.card_faces ?? []) if (!lookup.has(f.name.toLowerCase())) lookup.set(f.name.toLowerCase(), c);
    }
  }
  const missing = new Set((json.not_found ?? []).map((n) => (kind === "id" ? n.id : n.name?.toLowerCase().trim())).filter(Boolean));
  const at = Date.now();
  for (const v of batch) {
    const k = kind === "id" ? v : v.toLowerCase().trim();
    const card = lookup.get(k) ?? (kind === "name" ? lookup.get(k.split(" // ")[0]) : undefined);
    if (card) cachePut("card", cardKey(kind, v), JSON.stringify(card), at);
    else if (missing.has(k)) cachePut("card", cardKey(kind, v), "null", at); // a real "no such card"
  }
}

const staleCardRefresh = new Set<string>();

async function getCardsCached(kind: CardKind, values: string[]): Promise<ScryfallCard[]> {
  const wanted = [...new Map(values.filter(Boolean).map((v) => [cardKey(kind, v), v])).entries()];
  const read = async () => Promise.all(wanted.map(async ([k]) => [k, await cacheGet("card", k)] as const));
  let entries = await read();
  const now = Date.now();
  const miss = wanted.filter((_, i) => !entries[i][1] || now - entries[i][1]!.at >= STALE_LIMIT_MS).map(([, v]) => v);
  const stale = wanted
    .filter((w, i) => entries[i][1] && now - entries[i][1]!.at >= CARD_FRESH_MS && !miss.includes(w[1]) && !staleCardRefresh.has(w[0]))
    .map(([, v]) => v);

  const chunks = (list: string[]) => Array.from({ length: Math.ceil(list.length / 75) }, (_, i) => list.slice(i * 75, i * 75 + 75));
  if (miss.length) {
    await Promise.all(chunks(miss).map((c) => fetchCollection(kind, c, "high").catch(() => {})));
    entries = await read();
  }
  if (stale.length) {
    for (const v of stale) staleCardRefresh.add(cardKey(kind, v));
    void Promise.all(chunks(stale).map((c) => fetchCollection(kind, c, "low").catch(() => {}))).finally(() => {
      for (const v of stale) staleCardRefresh.delete(cardKey(kind, v));
    });
  }

  const seen = new Set<string>();
  const out: ScryfallCard[] = [];
  for (const [, e] of entries) {
    if (!e || e.body === "null") continue;
    try {
      const card = JSON.parse(e.body) as ScryfallCard;
      if (seen.has(card.id)) continue;
      seen.add(card.id);
      out.push(card);
    } catch {
      /* corrupt entry: skipped, refetched next time it expires */
    }
  }
  return out;
}

export async function getCardsByNames(names: string[]): Promise<ScryfallCard[]> {
  if (names.length === 0) return [];
  return getCardsCached("name", names);
}

// Same as getCardsByNames but keyed by Scryfall printing id — used to backfill stored cards
// (e.g. collection color identity) without re-deriving names. Returns in no guaranteed order;
// callers map results back by card.id.
export async function getCardsByIds(ids: string[]): Promise<ScryfallCard[]> {
  if (ids.length === 0) return [];
  return getCardsCached("id", ids);
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

/**
 * Every printing of a card, page by page (Scryfall returns 175 per page), so the art picker can
 * show the first results straight away. Includes extras (tokens, art series), rare variants that
 * Scryfall hides by default (include_variations) and, when asked, non-English printings.
 */
export async function streamAllPrintings(
  name: string,
  opts: { multilingual?: boolean; signal?: AbortSignal },
  onPage: (cards: ScryfallCard[], info: { total: number; done: boolean }) => void
): Promise<void> {
  const params = new URLSearchParams({
    q: `!"${name}"`,
    unique: "prints",
    order: "released",
    dir: "desc",
    include_extras: "true",
    include_variations: "true",
    include_multilingual: opts.multilingual ? "true" : "false",
  });
  let url: string | undefined = `${SCRYFALL_API}/cards/search?${params}`;
  while (url) {
    const res = await sfetch(url, { headers: { Accept: "application/json" }, signal: opts.signal });
    if (res.status === 404) {
      onPage([], { total: 0, done: true });
      return;
    }
    if (!res.ok) throw new ScryfallBusyError(`Scryfall search failed (${res.status})`);
    const page = (await res.json()) as ScryfallSearchResponse;
    url = page.has_more ? page.next_page : undefined;
    onPage(page.data ?? [], { total: page.total_cards ?? 0, done: !url });
  }
}

/** Short labels for what makes a printing special (shown under each option in the art picker). */
export function printingTags(card: ScryfallCard): string[] {
  const tags: string[] = [];
  const fx = card.frame_effects ?? [];
  if (card.border_color === "borderless") tags.push("Borderless");
  if (fx.includes("showcase")) tags.push("Showcase");
  if (fx.includes("extendedart")) tags.push("Extended art");
  if (fx.includes("etched") || card.finishes?.includes("etched")) tags.push("Etched");
  if (fx.includes("inverted")) tags.push("Inverted");
  if (card.full_art) tags.push("Full art");
  if (card.promo_types?.includes("serialized")) tags.push("Serialized");
  else if (card.promo_types?.length) tags.push("Promo");
  if (card.variation) tags.push("Variant");
  if (card.lang && card.lang !== "en") tags.push(card.lang.toUpperCase());
  return tags;
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

// Set types where new commanders actually debut (a main set and its Commander decks). Promos,
// masters reprints and box sets would only badge old cards.
const NEW_BADGE_SET_TYPES = new Set(["expansion", "core", "draft_innovation", "commander"]);

// The codes of the newest sets that are already out, newest first, for the 'New' badge on the
// commanders grid. Comes from Scryfall's set list (cached a day), so it moves on by itself when the
// next set releases; unreleased sets never count. Any error just means no badges.
export async function getNewestReleasedSetCodes(count = 2): Promise<string[]> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const sets = await getCommanderSets();
    return sets
      .filter((s) => NEW_BADGE_SET_TYPES.has(s.set_type) && (s.released_at ?? "9999") <= today)
      .slice(0, count)
      .map((s) => s.code);
  } catch {
    return [];
  }
}

// Gameplay set types worth a spoilers page (skips promos, tokens, box sets, Funny, etc.).
const SPOILER_SET_TYPES = new Set(["expansion", "core", "commander", "draft_innovation", "masters", "alchemy", "arsenal"]);

// Sets for the /spoilers hub: everything upcoming (release date in the future, or not set yet —
// i.e. mid-spoiler season with no date) plus everything released in the last ~5 months. No
// card-count floor, so a set that's only just started previewing still shows up. Sorted so the
// newest / not-yet-released sets come first.
export async function getSpoilerSets(): Promise<ScryfallSet[]> {
  const res = await sfetch(`${SCRYFALL_API}/sets`, {
    headers: { "User-Agent": "mtg-hub/1.0", Accept: "application/json" },
    next: { revalidate: 21600 },
  });
  if (!res.ok) return [];
  const json = await res.json();
  const sets: ScryfallSet[] = json.data ?? [];
  const now = Date.now();
  const WINDOW_MS = 150 * 86400000;
  return sets
    .filter((s) => {
      if (EXCLUDED_SET_TYPES.has(s.set_type) || !SPOILER_SET_TYPES.has(s.set_type)) return false;
      if (!s.released_at) return true; // no date yet → upcoming
      return new Date(s.released_at).getTime() > now - WINDOW_MS;
    })
    .sort((a, b) => (b.released_at ?? "9999-99-99").localeCompare(a.released_at ?? "9999-99-99"));
}

// A single set by its code (works even for a future set with no cards previewed yet).
export async function getSet(code: string): Promise<ScryfallSet | null> {
  const res = await sfetch(`${SCRYFALL_API}/sets/${encodeURIComponent(code.toLowerCase())}`, {
    headers: { "User-Agent": "mtg-hub/1.0", Accept: "application/json" },
    next: { revalidate: 21600 },
  });
  if (!res.ok) return null;
  return (await res.json()) as ScryfallSet;
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
