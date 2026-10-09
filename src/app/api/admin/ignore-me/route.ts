import { NextResponse } from "next/server";
import { IGNORE_COOKIE, ignoreCookieValue, linkValid } from "@/lib/ignoreMe";
import { hit, ipFrom } from "@/lib/rateLimit";
import { absoluteUrl } from "@/lib/site";

// Opened from Nexus ("Don't count this browser"): sets a cookie so this browser's visits aren't
// counted as visitors. Unsigned or expired links get a 404.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  if (!hit(`ignore-me:${ipFrom(req.headers)}`, 10, 60_000) || !linkValid(u.searchParams.get("t"), u.searchParams.get("s")))
    return new NextResponse("Not found", { status: 404 });
  const res = NextResponse.redirect(absoluteUrl("/?counted=no")) // behind the proxy req.url is the container's address;
  res.cookies.set(IGNORE_COOKIE, ignoreCookieValue(), { httpOnly: true, secure: u.protocol === "https:", sameSite: "lax", path: "/", maxAge: 365 * 86400 });
  return res;
}
