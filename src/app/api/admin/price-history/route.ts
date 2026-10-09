import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { adminAllowed } from "@/lib/adminKey";
import { hit, ipFrom } from "@/lib/rateLimit";

// Backfills daily price history from an outside source (MTGJSON's 90-day file), run once from
// the owner's PC. GET lists the printings the site tracks; POST adds days of history. Days the
// site already recorded itself are never overwritten. Needs the admin key, otherwise 404.
export const dynamic = "force-dynamic";

const notFound = () => new NextResponse("Not found", { status: 404 });
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const price = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 1e6 ? v : null);

export async function GET(req: Request) {
  if (!hit(`admin-prices:${ipFrom(req.headers)}`, 30, 60 * 1000) || !adminAllowed(req)) return notFound();
  const rows = await db.cardPrice.findMany({ select: { scryfallId: true } });
  return NextResponse.json({ ids: rows.map((r) => r.scryfallId) });
}

export async function POST(req: Request) {
  if (!hit(`admin-prices:${ipFrom(req.headers)}`, 240, 60 * 1000) || !adminAllowed(req)) return notFound();
  const body = (await req.json().catch(() => null)) as { rows?: unknown[] } | null;
  if (!body || !Array.isArray(body.rows) || body.rows.length > 3000) return NextResponse.json({ error: "Send {rows:[{id, day, usd, usdFoil}]} (up to 3000)" }, { status: 400 });
  const today = new Date().toISOString().slice(0, 10);
  const clean = body.rows.flatMap((r) => {
    const x = r as { id?: unknown; day?: unknown; usd?: unknown; usdFoil?: unknown };
    if (typeof x.id !== "string" || !ID.test(x.id) || typeof x.day !== "string" || !DAY.test(x.day) || x.day >= today) return [];
    const usd = price(x.usd);
    const usdFoil = price(x.usdFoil);
    return usd === null && usdFoil === null ? [] : [{ id: x.id, day: x.day, usd, usdFoil }];
  });
  if (clean.length) {
    await db.$transaction(
      clean.map(
        (r) => db.$executeRaw`INSERT OR IGNORE INTO "CardPriceHistory" ("id", "scryfallId", "day", "usd", "usdFoil") VALUES (${randomUUID()}, ${r.id}, ${r.day}, ${r.usd}, ${r.usdFoil})`
      )
    );
  }
  return NextResponse.json({ received: body.rows.length, accepted: clean.length });
}
