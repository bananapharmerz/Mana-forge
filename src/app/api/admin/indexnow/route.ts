import { NextResponse } from "next/server";
import { adminAllowed } from "@/lib/adminKey";
import { hit, ipFrom } from "@/lib/rateLimit";
import { pingIndexNow, indexNowEnabled } from "@/lib/indexnow";
import { buildSiteUrls } from "@/lib/indexnowDaily";

// Manual / belt-and-suspenders IndexNow submit: tell Bing/Yandex/etc. about the evergreen SEO
// landing pages plus whatever decks, commanders and spoiler galleries changed most recently. The
// server already does this on its own once a day in-process (startIndexNowDaily in instrumentation),
// so this route is just for forcing a submit on demand. Needs the admin key (same header as the
// other /api/admin routes), otherwise 404:
//
//   curl -fsS -H "x-admin-key: $ADMIN_API_KEY" https://manaforgehub.com/api/admin/indexnow
//
export const dynamic = "force-dynamic";

const notFound = () => new NextResponse("Not found", { status: 404 });

async function run(req: Request) {
  if (!hit(`admin-indexnow:${ipFrom(req.headers)}`, 10, 60 * 1000) || !adminAllowed(req)) return notFound();
  if (!indexNowEnabled()) {
    return NextResponse.json({ ok: false, skipped: true, reason: "IndexNow disabled (needs a public https site URL)." });
  }
  const urls = await buildSiteUrls();
  const result = await pingIndexNow(urls);
  return NextResponse.json({ ...result, collected: urls.length });
}

// GET for easy scheduling/curl, POST for well-behaved cron runners — both do the same thing.
export const GET = run;
export const POST = run;
