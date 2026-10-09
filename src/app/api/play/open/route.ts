import { NextResponse } from "next/server";
import { listOpenRooms } from "@/lib/gameRooms";
import { hit, ipFrom } from "@/lib/rateLimit";

export async function GET(req: Request) {
  if (!hit(`rooms:${ipFrom(req.headers)}`, 120, 60 * 1000)) return NextResponse.json({ rooms: [] }, { status: 429 });
  return NextResponse.json({ rooms: listOpenRooms() });
}
