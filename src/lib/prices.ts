import { db } from "@/lib/db";
import { sfetch } from "@/lib/scryfall";

// Card price tracker. Scryfall publishes one price per printing per day, so Mana Forge keeps:
//   CardPrice         - the latest price for every printing that's in a deck or on a watchlist
//   CardPriceHistory  - one snapshot per printing per day, for "this week" changes and charts
// refreshPrices() fetches whatever is older than a day, 75 cards per request (Scryfall's
// /cards/collection limit) with a pause between requests as Scryfall asks. It runs hourly from
// src/instrumentation.ts and on demand for cards a page needs that have no price yet.

const SCRYFALL = process.env.SCRYFALL_API_URL || "https://api.scryfall.com"; // override only for testing
const STALE_MS = 20 * 3600000;
const BATCH = 75;
const PAUSE_MS = 120;


// SQLite caps how many values one query may carry (Prisma sends each id as one), and with hundreds
// of decks the tracked cards run into the tens of thousands, so long id lists go in batches.
const CHUNK = 500;
export async function inChunks<T>(ids: string[], run: (part: string[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) out.push(...(await run(ids.slice(i, i + CHUNK))));
  return out;
}

export const today = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const num = (v: string | null | undefined) => {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

interface ScryfallPriced {
  id: string;
  name: string;
  set_name?: string;
  image_uris?: { small?: string; normal?: string };
  card_faces?: { image_uris?: { small?: string; normal?: string } }[];
  prices?: { usd?: string | null; usd_foil?: string | null; usd_etched?: string | null; eur?: string | null };
}

// Every printing the site cares about: cards in any deck (commanders included) and on watchlists.
export async function trackedIds(): Promise<string[]> {
  const ids = new Set<string>();
  const decks = await db.deck.findMany({ select: { commanderData: true, partnerCommanderData: true, companionData: true, cards: true } });
  const add = (raw: string | null) => {
    if (!raw) return;
    try {
      const v = JSON.parse(raw) as { scryfallId?: string } | { scryfallId?: string }[];
      for (const c of Array.isArray(v) ? v : [v]) if (c?.scryfallId) ids.add(c.scryfallId);
    } catch {}
  };
  for (const d of decks) {
    add(d.commanderData);
    add(d.partnerCommanderData);
    add(d.companionData);
    add(d.cards);
  }
  for (const w of await db.priceWatch.findMany({ select: { scryfallId: true } })) ids.add(w.scryfallId);
  return [...ids];
}

const g = globalThis as unknown as { __priceRefresh?: Promise<RefreshResult> | null; __priceTimer?: ReturnType<typeof setInterval> };

export interface RefreshResult {
  checked: number;
  updated: number;
  missing: number;
  failedBatches: number;
}

async function fetchBatch(ids: string[]): Promise<{ found: ScryfallPriced[]; missing: number } | null> {
  try {
    const res = await sfetch(`${SCRYFALL}/cards/collection`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "mtg-hub/1.0" },
      body: JSON.stringify({ identifiers: ids.map((id) => ({ id })) }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 429) {
      await sleep(2000);
      return null;
    }
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: ScryfallPriced[]; not_found?: unknown[] };
    return { found: json.data ?? [], missing: json.not_found?.length ?? 0 };
  } catch {
    return null;
  }
}

async function save(cards: ScryfallPriced[]) {
  const day = today();
  for (const c of cards) {
    const usd = num(c.prices?.usd);
    const usdFoil = num(c.prices?.usd_foil) ?? num(c.prices?.usd_etched);
    const data = {
      name: c.name,
      setName: c.set_name ?? null,
      imageUrl: c.image_uris?.normal ?? c.card_faces?.[0]?.image_uris?.normal ?? null,
      usd,
      usdFoil,
      eur: num(c.prices?.eur),
    };
    await db.$transaction([
      db.cardPrice.upsert({ where: { scryfallId: c.id }, create: { scryfallId: c.id, ...data }, update: data }),
      db.cardPriceHistory.upsert({
        where: { scryfallId_day: { scryfallId: c.id, day } },
        create: { scryfallId: c.id, day, usd, usdFoil },
        update: { usd, usdFoil },
      }),
    ]);
  }
}

// Fetch prices for the given printings (or everything tracked) that are older than a day.
// Only one refresh runs at a time; a second caller waits for the one in progress.
export async function refreshPrices(opts: { ids?: string[]; force?: boolean; limit?: number } = {}): Promise<RefreshResult> {
  if (g.__priceRefresh) {
    await g.__priceRefresh.catch(() => null);
    if (!opts.ids) return { checked: 0, updated: 0, missing: 0, failedBatches: 0 };
  }
  const run = (async () => {
    const wanted = [...new Set(opts.ids ?? (await trackedIds()))].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    let todo = wanted;
    if (!opts.force && wanted.length) {
      const fresh = new Set(
        (
          await inChunks(wanted, (part) =>
            db.cardPrice.findMany({
              where: { scryfallId: { in: part }, updatedAt: { gte: new Date(Date.now() - STALE_MS) } },
              select: { scryfallId: true },
            })
          )
        ).map((r) => r.scryfallId)
      );
      todo = wanted.filter((id) => !fresh.has(id));
    }
    if (opts.limit) todo = todo.slice(0, opts.limit);
    const result: RefreshResult = { checked: todo.length, updated: 0, missing: 0, failedBatches: 0 };
    for (let i = 0; i < todo.length; i += BATCH) {
      if (i) await sleep(PAUSE_MS);
      const r = await fetchBatch(todo.slice(i, i + BATCH));
      if (!r) {
        result.failedBatches++;
        continue;
      }
      await save(r.found);
      result.updated += r.found.length;
      result.missing += r.missing;
    }
    return result;
  })();
  g.__priceRefresh = run;
  try {
    return await run;
  } finally {
    g.__priceRefresh = null;
  }
}

// Hourly check; each pass only fetches what's more than a day old, so it's cheap.
export function startPriceTracker() {
  if (g.__priceTimer) return;
  const tick = () =>
    void refreshPrices()
      .then((r) => r.checked && console.log(`[prices] refreshed ${r.updated}/${r.checked} cards${r.failedBatches ? `, ${r.failedBatches} batches failed` : ""}`))
      .then(() => import("./priceAlerts").then((m) => m.runPriceAlerts()))
      .then((a) => a.emailed && console.log(`[prices] sent ${a.emailed} price alert emails`))
      .catch((e) => console.error("[prices] refresh failed:", e));
  g.__priceTimer = setInterval(tick, 3600000);
  setTimeout(tick, 30000);
}

// ---- reading --------------------------------------------------------------------------------------

export interface LivePrice {
  usd: number | null;
  usdFoil: number | null;
  weekAgoUsd: number | null; // the oldest snapshot from the last 7 days
  updatedAt: number;
}

export async function livePrices(ids: string[]): Promise<Record<string, LivePrice>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return {};
  const weekStart = today(Date.now() - 7 * 86400000);
  const [rows, history] = await Promise.all([
    inChunks(unique, (part) => db.cardPrice.findMany({ where: { scryfallId: { in: part } } })),
    inChunks(unique, (part) =>
      db.cardPriceHistory.findMany({
        where: { scryfallId: { in: part }, day: { gte: weekStart, lt: today() } },
        orderBy: { day: "asc" },
        select: { scryfallId: true, usd: true },
      })
    ),
  ]);
  const old = new Map<string, number | null>();
  for (const h of history) if (!old.has(h.scryfallId)) old.set(h.scryfallId, h.usd);
  return Object.fromEntries(
    rows.map((r) => [r.scryfallId, { usd: r.usd, usdFoil: r.usdFoil, weekAgoUsd: old.get(r.scryfallId) ?? null, updatedAt: r.updatedAt.getTime() }])
  );
}

export interface Mover {
  scryfallId: string;
  name: string;
  setName: string | null;
  imageUrl: string | null;
  usd: number;
  weekAgoUsd: number;
  change: number;
  pct: number;
}

// The tracked cards whose price moved most over the last week (at least $1 to matter).
export async function weeklyMovers(limit = 8): Promise<{ up: Mover[]; down: Mover[] }> {
  const weekStart = today(Date.now() - 7 * 86400000);
  const history = await db.cardPriceHistory.findMany({
    where: { day: { gte: weekStart, lt: today() }, usd: { gte: 1 } },
    orderBy: { day: "asc" },
    select: { scryfallId: true, usd: true },
  });
  const old = new Map<string, number>();
  for (const h of history) if (!old.has(h.scryfallId) && h.usd !== null) old.set(h.scryfallId, h.usd);
  if (!old.size) return { up: [], down: [] };
  const now = await inChunks([...old.keys()], (part) => db.cardPrice.findMany({ where: { scryfallId: { in: part }, usd: { not: null } } }));
  const movers: Mover[] = now
    .map((p) => {
      const before = old.get(p.scryfallId)!;
      const change = p.usd! - before;
      return { scryfallId: p.scryfallId, name: p.name, setName: p.setName, imageUrl: p.imageUrl, usd: p.usd!, weekAgoUsd: before, change, pct: before ? change / before : 0 };
    })
    .filter((m) => Math.abs(m.change) >= 0.25 && Math.abs(m.pct) >= 0.03);
  return {
    up: movers.filter((m) => m.change > 0).sort((a, b) => b.pct - a.pct).slice(0, limit),
    down: movers.filter((m) => m.change < 0).sort((a, b) => a.pct - b.pct).slice(0, limit),
  };
}

export async function priceHistory(ids: string[], days = 30): Promise<Record<string, { day: string; usd: number | null }[]>> {
  if (!ids.length) return {};
  const rows = await inChunks(ids, (part) =>
    db.cardPriceHistory.findMany({
      where: { scryfallId: { in: part }, day: { gte: today(Date.now() - days * 86400000) } },
      orderBy: { day: "asc" },
      select: { scryfallId: true, day: true, usd: true },
    })
  );
  const out: Record<string, { day: string; usd: number | null }[]> = {};
  for (const r of rows) (out[r.scryfallId] ??= []).push({ day: r.day, usd: r.usd });
  return out;
}

export async function mostValuable(limit = 8) {
  return db.cardPrice.findMany({ where: { usd: { not: null } }, orderBy: { usd: "desc" }, take: limit });
}

export async function trackerStats() {
  const [cards, newest] = await Promise.all([db.cardPrice.count(), db.cardPrice.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } })]);
  return { cards, updatedAt: newest?.updatedAt.getTime() ?? 0 };
}
