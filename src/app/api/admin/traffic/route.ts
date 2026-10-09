import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { adminAllowed } from "@/lib/adminKey";
import { hit, ipFrom } from "@/lib/rateLimit";
import { trafficDays } from "@/lib/traffic";

// For Nexus's Activity panel: real people vs bots per day, and which Premium plan members
// chose. Real people = distinct visitors whose browser ran the analytics beacon (bots almost
// never do). Bots = page loads from crawler / script user agents. Needs the admin key, else 404.
export const dynamic = "force-dynamic";

const g = globalThis as unknown as { __mfPlans?: { at: number; data: { month: number; year: number; trialing: number } } };

async function plans() {
  if (g.__mfPlans && Date.now() - g.__mfPlans.at < 10 * 60 * 1000) return g.__mfPlans.data;
  const data = { month: 0, year: 0, trialing: 0 };
  const key = process.env.STRIPE_SECRET_KEY;
  if (key) {
    const subs = await new Stripe(key).subscriptions.list({ status: "all", limit: 100 }).catch(() => null);
    for (const s of subs?.data ?? []) {
      if (s.status !== "active" && s.status !== "trialing") continue;
      const interval = s.items.data[0]?.price?.recurring?.interval;
      if (interval === "year") data.year++;
      else if (interval === "month") data.month++;
      if (s.status === "trialing") data.trialing++;
    }
  }
  g.__mfPlans = { at: Date.now(), data };
  return data;
}

export async function GET(req: Request) {
  if (!hit(`admin-traffic:${ipFrom(req.headers)}`, 30, 60 * 1000) || !adminAllowed(req)) return notFound();
  const days = trafficDays(7);
  const since = new Date(`${days[0].day}T00:00:00Z`);
  const visits = await db.hit.findMany({ where: { at: { gte: since }, kind: "view" }, select: { at: true, visitor: true } });
  const people = new Map<string, Set<string>>();
  for (const v of visits) {
    const d = v.at.toISOString().slice(0, 10);
    (people.get(d) ?? people.set(d, new Set()).get(d)!).add(v.visitor);
  }
  const [members, premium] = await Promise.all([db.user.count(), db.user.count({ where: { tier: "premium" } })]);
  return NextResponse.json({
    days: days.map((d) => ({ ...d, people: people.get(d.day)?.size ?? 0 })),
    members,
    premium,
    plans: await plans(),
  });
}

const notFound = () => new NextResponse("Not found", { status: 404 });
