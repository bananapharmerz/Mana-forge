import { NextResponse, type NextRequest } from "next/server";
import { readFileSync, statSync } from "node:fs";
import { bansFile, hashIp, type BansFile } from "@/lib/banHash";
import { ipFrom } from "@/lib/ipFrom";
import { countPage } from "@/lib/traffic";
import { isIgnored, isNexus } from "@/lib/ignoreMe";

// 1. Banned IPs (src/lib/bans.ts) see /banned instead of the site. The list is a small JSON file
//    re-read at most every 10 seconds, and only when it changed.
// 2. While the shop is switched off (NEXT_PUBLIC_SHOP_ENABLED, see src/lib/features.ts), every
//    store and proxy page shows the "coming soon" page instead.
// 3. Page loads are counted (browsers vs bots) for Nexus's Activity panel.

const g = globalThis as unknown as { __mfBans?: { checked: number; mtime: number; bans: BansFile } };
function bans(): BansFile {
  const now = Date.now();
  const c = (g.__mfBans ??= { checked: 0, mtime: 0, bans: {} });
  if (now - c.checked < 10_000) return c.bans;
  c.checked = now;
  try {
    const m = statSync(bansFile()).mtimeMs;
    if (m !== c.mtime) {
      c.bans = JSON.parse(readFileSync(bansFile(), "utf8")) as BansFile;
      c.mtime = m;
    }
  } catch {
    c.bans = {};
  }
  return c.bans;
}

// Always reachable, even when banned: the ban page itself, the legal pages, payments and Nexus's admin API.
const OPEN_PATHS = ["/banned", "/legal", "/api/webhooks", "/api/admin"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Page loads, split into browsers and bots (src/lib/traffic.ts). Totals only.
  // The owner's own browser (cookie from Nexus) and Nexus itself aren't counted at all.
  const ua = request.headers.get("user-agent");
  if (request.method === "GET" && !pathname.startsWith("/api/") && (request.headers.get("accept") ?? "").includes("text/html") && !isNexus(ua) && !isIgnored(request.headers.get("cookie"))) {
    countPage(ua);
  }
  const list = bans();
  if (Object.keys(list).length && !OPEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const hit = list[hashIp(ipFrom(request.headers))];
    if (hit && hit.until > Date.now()) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Access from your connection is paused.", code: hit.code }, { status: 403 });
      const url = new URL("/banned", request.url);
      url.searchParams.set("code", hit.code);
      return NextResponse.rewrite(url, { status: 403 });
    }
  }

  const shop = pathname === "/store" || pathname.startsWith("/store/") || pathname === "/proxies" || pathname.startsWith("/proxies/");
  if (shop && process.env.NEXT_PUBLIC_SHOP_ENABLED !== "1") return NextResponse.rewrite(new URL("/coming-soon", request.url));
  return NextResponse.next();
}

export const config = {
  // Everything except Next's static files and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|robots.txt|sitemap.xml|.well-known).*)"],
};
