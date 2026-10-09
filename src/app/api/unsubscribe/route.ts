import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";
import { unsubscribeValid } from "@/lib/unsubscribe";

// Turns price alerts off. Two callers:
//   - mail apps' own "Unsubscribe" button (RFC 8058 one-click: POST with List-Unsubscribe=One-Click)
//   - the button on /unsubscribe (form field from=page), which then shows the confirmation
export async function POST(req: Request) {
  const u = new URL(req.url);
  const id = u.searchParams.get("u");
  const s = u.searchParams.get("s");
  if (!unsubscribeValid(id, s)) return new NextResponse("Not found", { status: 404 });
  await db.user.update({ where: { id: id! }, data: { priceAlerts: false } }).catch(() => null);
  const form = await req.formData().catch(() => null);
  if (form?.get("from") === "page") return NextResponse.redirect(absoluteUrl(`/unsubscribe?done=1`), 303);
  return new NextResponse("Unsubscribed", { status: 200 });
}
