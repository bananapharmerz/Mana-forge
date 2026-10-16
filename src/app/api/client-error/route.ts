import { NextResponse } from "next/server";
import { hit, ipFrom } from "@/lib/rateLimit";
import { logServerError } from "@/lib/errorLog";
import { SITE } from "@/lib/site";

// Browsers post here when a page crashes on their side (src/lib/reportClientError.ts, called from
// the error pages). It goes into the same ErrorLog as server errors with kind "client", so the
// Repair Yard can show it as a browser crash. Stored: digest, path without query string, the
// masked message (first 300 characters) and the browser family. Never the IP, the full user
// agent or an account id; the IP is only used in memory for the rate limit.

export const dynamic = "force-dynamic";

const MAX_BODY = 2_000;
const BOTS = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|httpclient|axios|node-fetch|go-http|java\//i;
const FAMILIES = new Set(["Samsung", "Opera", "Edge", "Firefox", "Chrome", "Safari", "Other"]);
const host = new URL(SITE.url).hostname;
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n) : "");

export async function POST(req: Request) {
  const ok = new NextResponse(null, { status: 204 });
  const h = req.headers;
  const ua = h.get("user-agent") ?? "";
  if (!ua || BOTS.test(ua)) return ok;
  // Only our own pages may report (a beacon from elsewhere is ignored).
  const origin = h.get("origin") ?? "";
  if (origin && !origin.endsWith(host) && !origin.includes("localhost")) return ok;
  // A crash loop in one browser shouldn't flood the log: 10 reports a minute per IP.
  if (!hit(`client-error:${ipFrom(h)}`, 10, 60_000)) return ok;

  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return ok;
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return ok;
  }

  const path = clip(body.p, 300).split("?")[0];
  if (!path.startsWith("/")) return ok;
  // Masked again here: never trust the browser to have done it.
  const message = clip(body.m, 300)
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]")
    .replace(/[A-Za-z0-9_\-]{24,}/g, "[token]");
  if (!message) return ok;
  const family = clip(body.b, 10);
  const digest = clip(body.d, 100);
  const err: Error & { digest?: string } = new Error(message);
  if (digest) err.digest = digest;

  // The browser family goes in the "method" column, so the Repair Yard shows e.g. "Safari /premium".
  await logServerError(err, { path, method: FAMILIES.has(family) ? family : "Other" }, "client");
  return ok;
}
