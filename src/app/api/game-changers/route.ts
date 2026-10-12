import { NextResponse } from "next/server";
import { getGameChangers } from "@/lib/gameChangers";
import { hit, ipFrom } from "@/lib/rateLimit";

// The Game Changers list for the deck editor and deck pages. The panel asks for it from the
// browser so no deck page ever waits on Scryfall; browsers and the CDN keep it for an hour.
export async function GET(req: Request) {
  if (!hit(`gamechangers:${ipFrom(req.headers)}`, 60, 60 * 1000)) return NextResponse.json({ names: [], updatedAt: null }, { status: 429 });
  const list = await getGameChangers();
  return NextResponse.json(list, {
    // An empty list means Scryfall hasn't answered yet, so don't let anyone cache that.
    headers: { "Cache-Control": list.names.length > 0 ? "public, max-age=3600" : "no-store" },
  });
}
