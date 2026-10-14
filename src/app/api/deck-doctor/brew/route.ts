import { NextResponse } from "next/server";
import { brewDeck } from "@/lib/deckDoctor";
import { hit, ipFrom } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const ip = ipFrom(req.headers);
  if (!hit(`brew:${ip}`, 20, 60 * 1000)) {
    return NextResponse.json({ error: "Brewing a little fast — give it a moment." }, { status: 429 });
  }
  let commander = "";
  let budget: number | undefined;
  try {
    const body = await req.json();
    commander = String(body?.commander ?? "").trim();
    const b = Number(body?.budget);
    if (Number.isFinite(b) && b > 0) budget = b;
  } catch {
    // validated below
  }
  if (commander.length < 2 || commander.length > 80) {
    return NextResponse.json({ error: "Pick a commander first." }, { status: 400 });
  }
  try {
    const deck = await brewDeck(commander, { budgetUsd: budget });
    if (!deck) {
      return NextResponse.json({ error: "Couldn't brew that one — EDHREC may not have enough data for this commander yet." }, { status: 404 });
    }
    return NextResponse.json(deck);
  } catch {
    return NextResponse.json({ error: "Something went wrong brewing that deck — try again." }, { status: 503 });
  }
}
