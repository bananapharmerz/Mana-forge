import { NextResponse } from "next/server";
import { getCardByName, ScryfallBusyError } from "@/lib/scryfall";
import { cardDetailFromScryfall } from "@/lib/cardDetail";

// Card detail by name, for the detail popup where only the name is on hand (the deck builder's
// recommendations). Resolves front-face names too (getCardByName handles that), so double-faced
// cards work. Cached, since card data rarely changes.
export async function GET(req: Request) {
  const name = (new URL(req.url).searchParams.get("name") ?? "").slice(0, 200).trim();
  if (!name) return NextResponse.json({ error: "Missing card name." }, { status: 400 });
  try {
    const card = await getCardByName(name);
    if (!card) return NextResponse.json({ error: "Card not found." }, { status: 404 });
    return NextResponse.json(cardDetailFromScryfall(card), {
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    });
  } catch (e) {
    if (e instanceof ScryfallBusyError) {
      return NextResponse.json({ error: "Scryfall is busy — try again." }, { status: 503 });
    }
    return NextResponse.json({ error: "Couldn't load that card." }, { status: 500 });
  }
}
