import { NextResponse } from "next/server";
import { getBoosterSets } from "@/lib/packs";
import { hit, ipFrom } from "@/lib/rateLimit";

export const revalidate = 86400;

export async function GET(req: Request) {
  if (!hit(`packsets:${ipFrom(req.headers)}`, 60, 60 * 1000)) {
    return NextResponse.json({ sets: [] }, { status: 429 });
  }
  try {
    const sets = await getBoosterSets();
    return NextResponse.json({ sets });
  } catch {
    return NextResponse.json({ sets: [] }, { status: 503 });
  }
}
