import { NextResponse } from "next/server";
import { REF_COOKIE, validCode } from "@/lib/referral";
import { hit, ipFrom } from "@/lib/rateLimit";
import { absoluteUrl } from "@/lib/site";

// An invite link: /r/<code>. Remembers who sent it (60 days) and lands the friend on sign-up,
// where the friend discount is explained.
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = NextResponse.redirect(absoluteUrl(validCode(code) ? "/signup?invited=1" : "/signup"));
  if (validCode(code) && hit(`ref:${ipFrom(req.headers)}`, 30, 60 * 60 * 1000)) {
    res.cookies.set(REF_COOKIE, code.toLowerCase(), { httpOnly: true, secure: absoluteUrl().startsWith("https:"), sameSite: "lax", path: "/", maxAge: 60 * 86400 });
  }
  return res;
}
