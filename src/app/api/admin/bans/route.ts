import { NextResponse } from "next/server";
import { adminAllowed as allowed } from "@/lib/adminKey";
import { db } from "@/lib/db";
import { liftBan } from "@/lib/bans";
import { hit, ipFrom } from "@/lib/rateLimit";

// For Nexus's Police Station: list bans and lift them after an appeal. Needs the
// `x-admin-key` header to match ADMIN_API_KEY (at least 32 characters). Without that key set,
// this route doesn't exist.
export const dynamic = "force-dynamic";

const notFound = () => new NextResponse("Not found", { status: 404 });

export async function GET(req: Request) {
  if (!hit(`admin:${ipFrom(req.headers)}`, 60, 60 * 1000) || !allowed(req)) return notFound();
  const bans = await db.ipBan.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { code: true, reason: true, area: true, strikes: true, email: true, createdAt: true, expiresAt: true, liftedAt: true, liftNote: true },
  });
  return NextResponse.json({ bans });
}

export async function POST(req: Request) {
  if (!hit(`admin:${ipFrom(req.headers)}`, 60, 60 * 1000) || !allowed(req)) return notFound();
  const body = (await req.json().catch(() => null)) as { action?: string; code?: string; note?: string } | null;
  if (body?.action !== "lift" || typeof body.code !== "string") return NextResponse.json({ error: "Send {action:'lift', code}" }, { status: 400 });
  const ok = await liftBan(body.code, typeof body.note === "string" ? body.note : undefined);
  return NextResponse.json({ ok });
}
