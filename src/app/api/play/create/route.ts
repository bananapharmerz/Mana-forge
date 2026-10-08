import { NextResponse } from "next/server";
import { createRoom } from "@/lib/gameRooms";
import { hit, ipFrom } from "@/lib/rateLimit";

export async function POST(req: Request) {
  // A visitor can open at most 10 rooms an hour.
  if (!hit(`play-create:${ipFrom(req.headers)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "You've opened a lot of rooms. Please wait a bit." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const maxPlayers = Number(body.maxPlayers) || 4;
  const isOpen = body.isOpen === true;
  const name = typeof body.name === "string" ? body.name : undefined;
  const code = createRoom(maxPlayers, isOpen, name);
  if (!code) return NextResponse.json({ error: "The play servers are full right now. Try again in a few minutes." }, { status: 503 });
  return NextResponse.json({ code });
}
