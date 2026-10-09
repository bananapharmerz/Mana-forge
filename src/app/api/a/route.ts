import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hit, ipFrom } from "@/lib/rateLimit";
import { SITE } from "@/lib/site";

// Anonymous visitor statistics, sent by the browser (src/components/SiteTracker.tsx).
// No cookies and nothing stored in the browser; the IP address is only used, together with a secret
// that changes every day, to make a short hash so one visit's pages can be grouped. It's never saved.
// Browsers that send "Do Not Track" or "Global Privacy Control" aren't counted. Kept for 90 days.

const BOTS = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|httpclient|axios|node-fetch|go-http|java\//i;
const KINDS = new Set(["view", "leave", "click"]);
const host = new URL(SITE.url).hostname;
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, n) : "");

export async function POST(req: Request) {
  const ok = new NextResponse(null, { status: 204 });
  const h = req.headers;
  const ua = h.get("user-agent") ?? "";
  if (!ua || BOTS.test(ua) || h.get("dnt") === "1" || h.get("sec-gpc") === "1") return ok;
  // Only our own pages may report (a beacon from elsewhere is ignored).
  const origin = h.get("origin") ?? "";
  if (origin && !origin.endsWith(host) && !origin.includes("localhost")) return ok;
  const ip = ipFrom(h);
  if (!hit(`stats:${ip}`, 240, 60_000)) return ok;

  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 2000) return ok;
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return ok;
  }
  const kind = clip(body.k, 8);
  const path = clip(body.p, 200);
  if (!KINDS.has(kind) || !path.startsWith("/") || path.startsWith("/api/")) return ok;

  let ref: string | null = null;
  try {
    const r = clip(body.r, 300);
    if (r) {
      const d = new URL(r).hostname.replace(/^www\./, "");
      if (d && !d.endsWith(host)) ref = d.slice(0, 80);
    }
  } catch {
    /* not a URL */
  }
  const day = new Date().toISOString().slice(0, 10);
  const visitor = createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}|${day}|${ip}|${ua}`).digest("hex").slice(0, 16);
  const device = /ipad|tablet/i.test(ua) ? "tablet" : /mobi|android|iphone/i.test(ua) ? "mobile" : "desktop";
  const country = clip(h.get("cf-ipcountry"), 2).toUpperCase() || null;
  const num = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : null);

  try {
    await db.$executeRaw`
      INSERT INTO "Hit" ("id", "at", "visitor", "kind", "path", "ref", "source", "country", "device", "ms", "scroll", "target")
      VALUES (${randomUUID()}, ${new Date().toISOString()}, ${visitor}, ${kind}, ${path}, ${kind === "view" ? ref : null}, ${clip(body.s, 40) || null}, ${country}, ${device},
              ${kind === "leave" ? num(body.ms, 3_600_000) : null}, ${kind === "leave" ? num(body.sc, 100) : null}, ${kind === "click" ? clip(body.t, 80) || null : null})`;
    // Now and then, forget anything older than 90 days.
    if (Math.random() < 0.002) await db.$executeRaw`DELETE FROM "Hit" WHERE "at" < ${new Date(Date.now() - 90 * 86400000).toISOString()}`;
  } catch {
    /* statistics must never break anything */
  }
  return ok;
}
