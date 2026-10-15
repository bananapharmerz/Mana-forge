import { NextResponse } from "next/server";
import { hit, ipFrom } from "@/lib/rateLimit";
import { securityEvent } from "@/lib/securityLog";

// Browsers post here when a script breaks the report-only content policy (next.config.ts).
// We only count which rule was broken (e.g. "script-src-elem", stored as "scriptsrcelem"),
// through the same once-a-minute tally as the other defences; the blocked address, the page,
// the IP and the browser are never stored. The IP is used in memory for the rate limit only.

export const dynamic = "force-dynamic";

const MAX_BODY = 20_000;
const MAX_REPORTS = 20;

// "script-src-elem https://x.example" (old report-uri format) -> "script-src-elem"
function directive(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const d = v.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return /^[a-z-]{3,30}$/.test(d) ? d : null;
}

export async function POST(req: Request) {
  const ok = new NextResponse(null, { status: 204 });
  if (!hit(`csp:${ipFrom(req.headers)}`, 30, 60_000)) return ok;

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return ok;
    body = JSON.parse(text);
  } catch {
    return ok;
  }

  // Two formats: report-to sends an array of { type, body: { effectiveDirective } },
  // the older report-uri sends { "csp-report": { "effective-directive" | "violated-directive" } }.
  const found: string[] = [];
  if (Array.isArray(body)) {
    for (const r of body.slice(0, MAX_REPORTS)) {
      const b = (r as { type?: unknown; body?: Record<string, unknown> } | null) ?? {};
      if (b.type !== "csp-violation" || !b.body) continue;
      const d = directive(b.body.effectiveDirective ?? b.body.violatedDirective);
      if (d) found.push(d);
    }
  } else if (body && typeof body === "object") {
    const r = (body as Record<string, Record<string, unknown> | undefined>)["csp-report"];
    const d = r && directive(r["effective-directive"] ?? r["violated-directive"]);
    if (d) found.push(d);
  }
  for (const d of found) securityEvent("csp_violation", d);
  return ok;
}
