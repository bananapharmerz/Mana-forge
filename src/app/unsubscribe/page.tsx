import Link from "next/link";
import type { Metadata } from "next";
import Ember from "@/components/Ember";
import { unsubscribeValid } from "@/lib/unsubscribe";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// From the "Unsubscribe" link in price alert emails. Opening the page changes nothing (email
// scanners open links on their own); the button does. No sign-in needed.
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ u?: string; s?: string; done?: string }> }) {
  const { u, s, done } = await searchParams;
  const valid = unsubscribeValid(u ?? null, s ?? null);
  const box = (mood: "happy" | "oops" | "thinking", title: string, text: string, extra?: React.ReactNode) => (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <Ember mood={mood} size={140} className="mx-auto" />
      <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">{title}</h1>
      <p className="mt-3 text-sm text-muted">{text}</p>
      {extra}
      <Link href="/premium" className="mt-6 inline-block text-sm text-gold-bright underline">
        Premium page
      </Link>
    </div>
  );
  if (done) return box("happy", "You're unsubscribed", "Price alert emails are off. You can turn them back on any time on the Premium page.");
  if (!valid) return box("oops", "That link doesn't work", "It may be incomplete. You can turn price alerts off on the Premium page when you're signed in.");
  return box(
    "thinking",
    "Stop price alert emails?",
    "One click and they're off. You can turn them back on any time.",
    <form method="post" action={`/api/unsubscribe?u=${encodeURIComponent(u!)}&s=${s}`} className="mt-6">
      <input type="hidden" name="from" value="page" />
      <button type="submit" className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black hover:bg-gold-bright">
        Turn off price alerts
      </button>
    </form>
  );
}
