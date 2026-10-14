import { NextResponse } from "next/server";
import { openPack, type PackCard } from "@/lib/packs";
import { ScryfallBusyError } from "@/lib/scryfall";
import { hit } from "@/lib/rateLimit";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { todayUtc, ripStatus } from "@/lib/packRips";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Create a free account to rip packs.", needsAuth: true }, { status: 401 });
  }
  if (!hit(`packopen:${userId}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: "Ripping a little fast — give it a second." }, { status: 429 });
  }

  let set = "";
  try {
    const body = await req.json();
    set = String(body?.set ?? "").toLowerCase().trim();
  } catch {
    // handled by validation below
  }
  if (!/^[a-z0-9]{2,6}$/.test(set)) {
    return NextResponse.json({ error: "Pick a set first." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { tier: true, packRipsDate: true, packRipsToday: true },
  });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 401 });

  const status = ripStatus(user);
  if (status.left <= 0) {
    return NextResponse.json(
      {
        error:
          user.tier === "premium"
            ? "You've opened all 10 of today's packs — more tomorrow."
            : "You've opened all 3 of today's free packs. Go Premium for 10 a day, or come back tomorrow.",
        outOfRips: true,
        ripsLeft: 0,
        limit: status.limit,
        tier: user.tier,
      },
      { status: 429 }
    );
  }

  let pack;
  try {
    pack = await openPack(set);
  } catch (e) {
    const msg = e instanceof ScryfallBusyError ? e.message : "Couldn't open that pack — try again.";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
  if (!pack) return NextResponse.json({ error: "Couldn't open that pack — try another set." }, { status: 404 });

  // Aggregate the pulled cards by printing so each becomes a single collection upsert.
  const byPrint = new Map<string, { card: PackCard; nonfoil: number; foil: number }>();
  for (const c of pack.cards) {
    const e = byPrint.get(c.scryfallId) ?? { card: c, nonfoil: 0, foil: 0 };
    if (c.foil) e.foil += 1;
    else e.nonfoil += 1;
    byPrint.set(c.scryfallId, e);
  }

  const today = todayUtc();
  const nextCount = (user.packRipsDate === today ? user.packRipsToday : 0) + 1;

  try {
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { packRipsDate: today, packRipsToday: nextCount } });
      for (const { card, nonfoil, foil } of byPrint.values()) {
        await tx.collectionCard.upsert({
          where: { userId_scryfallId: { userId, scryfallId: card.scryfallId } },
          create: {
            userId,
            scryfallId: card.scryfallId,
            name: card.name,
            setCode: card.setCode,
            setName: card.setName,
            rarity: card.rarity,
            colors: card.colors,
            imageUrl: card.image ?? null,
            collectorNumber: card.collectorNumber ?? null,
            scryfallUri: card.scryfallUri ?? null,
            priceUsd: card.priceUsd ?? null,
            quantity: nonfoil,
            foilQuantity: foil,
          },
          update: {
            quantity: { increment: nonfoil },
            foilQuantity: { increment: foil },
            colors: card.colors,
            priceUsd: card.priceUsd ?? undefined,
          },
        });
      }
    });
  } catch {
    // Transaction rolled back — the rip wasn't counted, so the member keeps their allowance.
    return NextResponse.json({ error: "Opened the pack but couldn't save it to your collection — try again." }, { status: 500 });
  }

  return NextResponse.json({ ...pack, ripsLeft: Math.max(0, status.limit - nextCount), limit: status.limit, tier: user.tier });
}
