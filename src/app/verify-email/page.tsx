import Link from "next/link";
import type { Metadata } from "next";
import Ember from "@/components/Ember";
import { confirmEmail } from "@/lib/emailVerify";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// The link from the welcome email lands here.
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const result = token ? await confirmEmail(token).catch(() => "invalid" as const) : "invalid";
  const view = {
    ok: { mood: "hyped" as const, title: "Email confirmed!", text: "Thanks. You're all set: price alerts and account emails will reach you now." },
    already: { mood: "happy" as const, title: "Already confirmed", text: "This link was already used, and your email is confirmed." },
    expired: { mood: "oops" as const, title: "This link has expired", text: "Links work for 7 days. Sign in and open your account page to get a new one." },
    invalid: { mood: "oops" as const, title: "That link doesn't work", text: "It may be incomplete. Try copying the whole link from the email, or get a new one from your account page." },
  }[result];
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <Ember mood={view.mood} size={150} className="mx-auto" />
      <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">{view.title}</h1>
      <p className="mt-3 text-sm text-muted">{view.text}</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/deck-builder" className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright">
          Start building
        </Link>
        <Link href="/account" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-gold">
          My account
        </Link>
      </div>
    </div>
  );
}
