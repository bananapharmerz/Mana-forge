import { NextResponse } from "next/server";
import { openPack } from "@/lib/packs";
import { ScryfallBusyError } from "@/lib/scryfall";
import { hit, ipFrom } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const ip = ipFrom(req.headers);
  if (!hit(`packopen:${ip}`, 45, 60 * 1000)) {
    return NextResponse.json({ error: "Ripping a little fast — give it a second." }, { status: 429 });
  }
  let set = "";
  try {
    const body = await req.json();
    set = String(body?.set ?? "").toLowerCase().trim();
  } catch {
    // no body / bad JSON -> handled by the validation below
  }
  if (!/^[a-z0-9]{2,6}$/.test(set)) {
    return NextResponse.json({ error: "Pick a set first." }, { status: 400 });
  }
  try {
    const pack = await openPack(set);
    return NextResponse.json(pack);
  } catch (e) {
    const msg = e instanceof ScryfallBusyError ? e.message : "Couldn't open that pack — try again.";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
