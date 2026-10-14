import { NextResponse } from "next/server";
import { adviseDeck } from "@/lib/deckAdvisor";
import { hit, ipFrom } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const ip = ipFrom(req.headers);
  if (!hit(`advise:${ip}`, 60, 60 * 1000)) {
    return NextResponse.json({ error: "Asking a little fast — give it a moment." }, { status: 429 });
  }

  let commander = "";
  let have: string[] = [];
  let maxCardUsd: number | undefined;
  try {
    const body = await req.json();
    commander = String(body?.commander ?? "").trim();
    if (Array.isArray(body?.have)) {
      have = body.have
        .filter((x: unknown): x is string => typeof x === "string")
        .slice(0, 200)
        .map((s: string) => s.slice(0, 120));
    }
    const m = Number(body?.maxCardUsd);
    if (Number.isFinite(m) && m > 0) maxCardUsd = m;
  } catch {
    // validated below
  }

  if (commander.length < 2 || commander.length > 80) {
    return NextResponse.json({ error: "No commander set yet." }, { status: 400 });
  }

  try {
    const advice = await adviseDeck(commander, { have, maxCardUsd });
    if (!advice) {
      return NextResponse.json({ error: "Not enough EDHREC data for this commander yet." }, { status: 404 });
    }
    return NextResponse.json(advice);
  } catch {
    return NextResponse.json({ error: "Couldn't get recommendations right now — try again." }, { status: 503 });
  }
}
