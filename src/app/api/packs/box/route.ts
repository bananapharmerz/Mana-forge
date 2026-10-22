import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { openPack, type PackCard } from "@/lib/packs";
import { ScryfallBusyError } from "@/lib/scryfall";
import { hit } from "@/lib/rateLimit";
import { BOX_PACKS } from "@/lib/tier";
import { boxStatus, isoWeekUtc } from "@/lib/packRips";
import { addPullsToCollection } from "@/lib/packCollection";

export const dynamic = "force-dynamic";

const ALREADY = "You've opened this week's booster box. A new one is ready on Monday.";

// Premium: rip a whole booster box (36 packs) of one set, once per ISO week (UTC). Every pull goes
// into the member's collection; the response is a summary (hits, best pull, value) rather than
// 540 individual reveals.
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in to open a booster box." }, { status: 401 });

  let set = "";
  try {
    set = String((await req.json())?.set ?? "").toLowerCase().trim();
  } catch {
    set = "";
  }
  if (!/^[a-z0-9]{2,6}$/.test(set)) return NextResponse.json({ error: "Pick a set first." }, { status: 400 });
  if (!hit(`boxopen:${userId}`, 5, 60 * 1000)) {
    return NextResponse.json({ error: "One box at a time — give it a second." }, { status: 429 });
  }

  const user = await db.user.findUnique({ where: { id: userId }, select: { tier: true, boxRipWeek: true } });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 401 });
  const box = boxStatus(user);
  if (!box.premium) {
    return NextResponse.json({ error: "Booster boxes are a Premium perk.", premiumRequired: true }, { status: 403 });
  }
  if (!box.available) return NextResponse.json({ error: ALREADY, nextAt: box.nextAt }, { status: 429 });

  // The set's card pool is cached after the first pack, so the other 35 are drawn in memory.
  const cards: PackCard[] = [];
  let setName = set.toUpperCase();
  try {
    for (let i = 0; i < BOX_PACKS; i++) {
      const pack = await openPack(set);
      setName = pack.setName;
      cards.push(...pack.cards);
    }
  } catch (e) {
    const msg = e instanceof ScryfallBusyError ? e.message : "Couldn't open that box — try again.";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
  if (!cards.length) return NextResponse.json({ error: "Couldn't open that box — try another set." }, { status: 404 });

  const week = isoWeekUtc();
  try {
    await db.$transaction(
      async (tx) => {
        // Claim the week first: if two requests race, only one gets past this.
        const claimed = await tx.user.updateMany({
          where: { id: userId, tier: "premium", OR: [{ boxRipWeek: null }, { boxRipWeek: { not: week } }] },
          data: { boxRipWeek: week },
        });
        if (claimed.count !== 1) throw new Error("already-opened");
        await addPullsToCollection(tx, userId, cards);
      },
      { timeout: 20_000 }
    );
  } catch (e) {
    if (e instanceof Error && e.message === "already-opened") return NextResponse.json({ error: ALREADY }, { status: 429 });
    // Rolled back: the week isn't used up, so the member can try again.
    return NextResponse.json({ error: "Opened the box but couldn't save it to your collection — try again." }, { status: 500 });
  }

  const price = (c: PackCard) => c.priceUsd ?? 0;
  // Hits: every rare and mythic, plus foils worth at least $1, most valuable first.
  const hits = cards.filter((c) => c.rarity === "rare" || c.rarity === "mythic" || (c.foil && price(c) >= 1)).sort((a, b) => price(b) - price(a));
  const count = (pred: (c: PackCard) => boolean) => cards.filter(pred).length;

  return NextResponse.json({
    setCode: set,
    setName,
    packs: BOX_PACKS,
    cardCount: cards.length,
    valueUsd: Math.round(cards.reduce((n, c) => n + price(c), 0) * 100) / 100,
    counts: {
      mythic: count((c) => c.rarity === "mythic"),
      rare: count((c) => c.rarity === "rare"),
      uncommon: count((c) => c.rarity === "uncommon"),
      common: count((c) => c.rarity === "common"),
      foil: count((c) => c.foil),
    },
    hits: hits.slice(0, 60),
    nextAt: boxStatus({ tier: "premium", boxRipWeek: week }).nextAt,
  });
}
