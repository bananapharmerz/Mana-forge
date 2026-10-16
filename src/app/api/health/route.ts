import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Health check for the Docker HEALTHCHECK (see Dockerfile) and the Nexus Repair Yard.
// Coolify only switches traffic to a new container once this answers 200, so a deploy that
// can't reach its database keeps the old container running instead of taking the site down.
// It only ever says {ok, db}: no versions, no error text, nothing about users.

export const dynamic = "force-dynamic";

const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    // The reason stays out of the response on purpose; a 503 is all a health check needs.
  }
  return NextResponse.json(
    { ok: dbOk, db: dbOk },
    { status: dbOk ? 200 : 503, headers: NO_CACHE },
  );
}
