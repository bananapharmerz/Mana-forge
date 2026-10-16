import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { ripStatus, guestRipStatus, GUEST_RIP_COOKIE } from "@/lib/packRips";

export const dynamic = "force-dynamic";

async function guestResponse() {
  const jar = await cookies();
  const g = guestRipStatus(jar.get(GUEST_RIP_COOKIE)?.value);
  return NextResponse.json({ signedIn: false, ripsLeft: g.left, limit: g.limit, tier: "guest" });
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return guestResponse();
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { tier: true, packRipsDate: true, packRipsToday: true },
  });
  if (!user) {
    return guestResponse();
  }
  const s = ripStatus(user);
  return NextResponse.json({ signedIn: true, ripsLeft: s.left, limit: s.limit, tier: user.tier });
}
