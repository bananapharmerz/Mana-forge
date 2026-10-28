import { NextResponse } from "next/server";
import { adminAllowed } from "@/lib/adminKey";
import { hit, ipFrom } from "@/lib/rateLimit";
import { runtimeStats } from "@/lib/runtimeStats";

// Admin key only (404 otherwise): process uptime, memory and event-loop stalls, to check that the
// server isn't freezing or restarting.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!hit(`admin-runtime:${ipFrom(req.headers)}`, 30, 60 * 1000) || !adminAllowed(req)) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(runtimeStats(), { headers: { "Cache-Control": "no-store" } });
}
