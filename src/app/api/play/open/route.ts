import { NextResponse } from "next/server";
import { listOpenRooms } from "@/lib/gameRooms";

export async function GET() {
  return NextResponse.json({ rooms: listOpenRooms() });
}
