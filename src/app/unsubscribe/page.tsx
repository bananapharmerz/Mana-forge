import Link from "next/link";
import type { Metadata } from "next";
import Ember from "@/components/Ember";
import { listOf, unsubscribeValid } from "@/lib/unsubscribe";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// From the "Unsubscribe" link in price alert and weekly roundup emails. Opening the page changes nothing (email
// scanners open links on their own); the button does. No sign-in needed.
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ u?: string; s?: string; done?: string; l?: string }> }) {
  const { u, s, done, l } = await searchParams;
  const list = listOf(l);
  const weekly = list === "weekly";
  const valid = unsubscribeValid(u ?? null, s ?? null, list);
  const box = (mood: "happy" | "oops" | "thinking", title: string, text: string, extra?: React.ReactNode) => (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <Ember mood={mood} size={140} className="mx-auto" />
      <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">{title}</h1>
      <p className="mt-3 text-sm text-muted">{text}</p>
      {extra}
      <Link href={weekly ? "/account" : "/premium"} className="mt-6 inline-block text-sm text-gold-bright underline">
        {weekly ? "Your account" : "Premium page"}
      </Link>
    </div>
  );
  if (done)
    return weekly
      ? box("happy", "You're unsubscribed", "The weekly roundup is off. You can turn it back on any time on your account page.")
      : box("happy", "You're unsubscribed", "Price alert emails are off. You can turn them back on any time on the Premium page.");
  if (!valid) return box("oops", "That link doesn't work", weekly ? "It may be incomplete. You can turn the weekly roundup off on your account page when you're signed in." : "It may be incomplete. You can turn price alerts off on the Premium page when you're signed in.");
  return box(
    "thinking",
    weekly ? "Stop the weekly roundup?" : "Stop price alert emails?",
    "One click and they're off. You can turn them back on any time.",
    <form method="post" action={`/api/unsubscribe?u=${encodeURIComponent(u!)}&s=${s}${weekly ? "&l=weekly" : ""}`} className="mt-6">
      <input type="hidden" name="from" value="page" />
      <button type="submit" className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black hover:bg-gold-bright">
        {weekly ? "Turn off the weekly roundup" : "Turn off price alerts"}
      </button>
    </form>
  );
}
