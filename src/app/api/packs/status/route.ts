import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ripStatus } from "@/lib/packRips";
import { FREE_PACK_RIPS } from "@/lib/tier";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ signedIn: false, ripsLeft: 0, limit: FREE_PACK_RIPS, tier: "free" });
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { tier: true, packRipsDate: true, packRipsToday: true },
  });
  if (!user) {
    return NextResponse.json({ signedIn: false, ripsLeft: 0, limit: FREE_PACK_RIPS, tier: "free" });
  }
  const s = ripStatus(user);
  return NextResponse.json({ signedIn: true, ripsLeft: s.left, limit: s.limit, tier: user.tier });
}
