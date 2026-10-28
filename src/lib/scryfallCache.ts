// A cache for Scryfall (and EDHREC) answers that survives deploys. Next's own fetch cache lives in .next/cache,
// which every deploy wipes, so after each deploy every page went back to Scryfall one request at a
// time (about 9 a second) and pages queued behind each other for 20-70s. Answers are kept in memory
// and as gzipped files beside the database on the persistent volume, so a fresh deploy starts warm.
// Old answers are still served (instantly) while a fresh copy is fetched in the background.

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { gunzip, gzip } from "node:zlib";

const gz = promisify(gzip);
const gunz = promisify(gunzip);

export interface CacheEntry {
  body: string;
  at: number; // when it was fetched (ms)
}

/** How long a stale answer may still be shown while it refreshes. */
export const STALE_LIMIT_MS = 30 * 86400_000;

// `next build` has no persistent volume, so the disk part is off there.
const diskOn = process.env.NEXT_PHASE !== "phase-production-build" && process.env.SCRYFALL_DISK_CACHE !== "0";
const root = () => path.join(path.dirname(process.env.DATABASE_PATH || path.join(process.cwd(), "dev.db")), "scryfall-cache");

class Lru {
  private map = new Map<string, CacheEntry>();
  private size = 0;
  constructor(private maxChars: number) {}
  get(key: string): CacheEntry | undefined {
    const e = this.map.get(key);
    if (e) {
      this.map.delete(key);
      this.map.set(key, e);
    }
    return e;
  }
  set(key: string, e: CacheEntry) {
    const old = this.map.get(key);
    if (old) {
      this.size -= old.body.length;
      this.map.delete(key);
    }
    this.map.set(key, e);
    this.size += e.body.length;
    while (this.size > this.maxChars && this.map.size > 1) {
      const [k, v] = this.map.entries().next().value!;
      this.map.delete(k);
      this.size -= v.body.length;
    }
  }
}

const g = globalThis as unknown as { __mfSfCache?: { mem: Lru; pruned?: boolean } };
// About 60 MB of JSON in memory; everything else comes from disk in a few milliseconds.
const state = (g.__mfSfCache ??= { mem: new Lru(30_000_000) });

const fileFor = (bucket: string, key: string) => {
  const h = createHash("sha1").update(key).digest("hex");
  return path.join(root(), bucket, h.slice(0, 2), `${h}.json.gz`);
};

export async function cacheGet(bucket: string, key: string): Promise<CacheEntry | null> {
  const k = `${bucket}|${key}`;
  const hot = state.mem.get(k);
  if (hot) return hot;
  if (!diskOn) return null;
  try {
    const raw = await fs.readFile(fileFor(bucket, key));
    const e = JSON.parse((await gunz(raw)).toString("utf8")) as CacheEntry & { key?: string };
    if (e.key !== key || typeof e.body !== "string") return null; // hash clash or old format
    const entry = { body: e.body, at: e.at };
    state.mem.set(k, entry);
    return entry;
  } catch {
    return null;
  }
}

export function cachePut(bucket: string, key: string, body: string, at = Date.now()) {
  state.mem.set(`${bucket}|${key}`, { body, at });
  if (!diskOn) return;
  maybePrune();
  const file = fileFor(bucket, key);
  // Written in the background; a failed write only means the next deploy fetches it again.
  void (async () => {
    try {
      await fs.mkdir(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
      await fs.writeFile(tmp, await gz(JSON.stringify({ key, at, body }), { level: 4 }));
      await fs.rename(tmp, file);
    } catch {
      /* disk full or read-only: memory still has it */
    }
  })();
}

// Once per process (and then daily), files nobody has refreshed in 30 days are removed so the
// cache can't grow forever.
function maybePrune() {
  if (state.pruned) return;
  state.pruned = true;
  const run = async () => {
    const cutoff = Date.now() - STALE_LIMIT_MS;
    let buckets: string[] = [];
    try {
      buckets = await fs.readdir(root());
    } catch {
      return;
    }
    for (const bucket of buckets) {
      let dirs: string[] = [];
      try {
        dirs = await fs.readdir(path.join(root(), bucket));
      } catch {
        continue;
      }
      for (const d of dirs) {
        const dir = path.join(root(), bucket, d);
        let files: string[] = [];
        try {
          files = await fs.readdir(dir);
        } catch {
          continue;
        }
        for (const f of files) {
          try {
            const st = await fs.stat(path.join(dir, f));
            if (st.mtimeMs < cutoff || (f.endsWith(".tmp") && st.mtimeMs < Date.now() - 3600_000)) await fs.unlink(path.join(dir, f));
          } catch {
            /* already gone */
          }
        }
      }
    }
  };
  const t = setTimeout(() => void run(), 10 * 60_000);
  t.unref?.();
  const i = setInterval(() => void run(), 86400_000);
  i.unref?.();
}

/** The cached entry if it is already in memory (no disk read), for cheap "is it ready?" checks. */
export function cachePeek(bucket: string, key: string): CacheEntry | undefined {
  return state.mem.get(`${bucket}|${key}`);
}

const swrInflight = ((globalThis as unknown as { __mfSwr?: Map<string, Promise<unknown>> }).__mfSwr ??= new Map());

/**
 * Cached answer for any slow source (EDHREC pages, scraped deck sources): fresh for `freshMs`,
 * then served stale while one background load refreshes it. `load` resolves `{ value }` to store
 * (value may be null, e.g. "this deck has no source link") or null when the load failed, which
 * stores nothing. With `waitMs`, a cold miss waits at most that long and then answers null (the
 * load carries on and the next caller gets it).
 */
export async function swr<T>(
  bucket: string,
  key: string,
  freshMs: number,
  load: () => Promise<{ value: T } | null>,
  opts: { waitMs?: number } = {}
): Promise<T | null> {
  const hit = await cacheGet(bucket, key);
  const age = hit ? Date.now() - hit.at : Infinity;
  const parsed = (): T | null => {
    try {
      return JSON.parse(hit!.body) as T;
    } catch {
      return null;
    }
  };
  if (hit && age < freshMs) return parsed();
  const k = `${bucket}|${key}`;
  let p = swrInflight.get(k) as Promise<T | null> | undefined;
  if (!p) {
    p = load()
      .then((r) => {
        if (!r) return null;
        cachePut(bucket, key, JSON.stringify(r.value ?? null));
        return r.value ?? null;
      })
      .catch(() => null)
      .finally(() => swrInflight.delete(k));
    swrInflight.set(k, p);
  }
  if (hit && age < STALE_LIMIT_MS) return parsed();
  if (opts.waitMs === undefined) return p;
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), opts.waitMs))]);
}

// scryfall.ts can't import this file (it also runs in the browser), so it finds it here.
(globalThis as unknown as { __mfSfStore?: unknown }).__mfSfStore = { cacheGet, cachePut };
