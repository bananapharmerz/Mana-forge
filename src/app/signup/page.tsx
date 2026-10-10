"use client";

import PasswordInput from "@/components/PasswordInput";
import { useState, useSyncExternalStore } from "react";
import Turnstile from "@/components/Turnstile";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { signup } from "@/app/actions/auth";
import { importGuestDeck } from "@/app/actions/decks";
import { clearGuestDeck, loadGuestDeck } from "@/lib/guestDeck";
import { trackGoal } from "@/components/SiteTracker";

const noSubscribe = () => () => {};

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ofAge, setOfAge] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [human, setHuman] = useState("");
  const [humanReset, setHumanReset] = useState(0);
  const [loading, setLoading] = useState(false);
  // Came through a friend's invite link (/r/<code> sends people here with ?invited=1)
  const invited = useSyncExternalStore(
    noSubscribe,
    () => new URLSearchParams(window.location.search).has("invited"),
    () => false
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signup(email, password, name, ofAge, human);
    if (!result.ok) {
      setHumanReset((n) => n + 1); // a Turnstile token works once
      setError(result.error);
      setLoading(false);
      return;
    }

    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (res?.error) {
      setError("Account created, but sign-in failed. Try signing in manually.");
      return;
    }
    trackGoal("signup");
    // A deck they built as a guest moves into the new account and opens straight away.
    const draft = loadGuestDeck();
    if (draft) {
      const r = await importGuestDeck(draft).catch(() => null);
      if (r?.ok) {
        trackGoal("deck");
        clearGuestDeck();
        router.push(`/deck-builder/${r.id}`);
        router.refresh();
        return;
      }
    }
    // Back to where they came from (e.g. the Premium page), but only ever a page on this site.
    const wanted = new URLSearchParams(window.location.search).get("callbackUrl") || "";
    const next = wanted.startsWith("/") && !wanted.startsWith("//") && !wanted.startsWith("/\\") ? wanted : "/deck-builder";
    router.push(next);
    router.refresh();
  }

  return (
    <div className="forge-band relative flex min-h-[calc(100vh-9rem)] items-start justify-center px-4 py-14 sm:items-center">
      <div className="relative w-full max-w-sm rounded-2xl border border-[#3a2f1c] bg-surface px-6 py-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] sm:px-8">
      {invited && (
        <p className="mb-4 rounded-lg border border-gold/50 bg-gold/10 px-3 py-2 text-sm text-foreground">
          🎁 A friend invited you: you get <b>50% off Premium for your first 3 months</b> (after the free trial) whenever you want it.
        </p>
      )}
      <h1 className="font-display text-3xl font-semibold text-foreground">Create account</h1>
      <p className="mt-1 text-sm text-muted">
        Free accounts save up to 10 decks and can play online. Premium adds unlimited decks, no ads and price alerts.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Name (optional)
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="signup-email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Password
          </label>
          <PasswordInput
            id="signup-password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted">At least 8 characters, with a letter and a number. Passwords found in data breaches are refused.</p>
        </div>
        <label className="flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            required
            checked={ofAge}
            onChange={(e) => setOfAge(e.target.checked)}
            className="mt-1 accent-[var(--color-gold)]"
          />
          <span>I&apos;m 16 or older.</span>
        </label>
        <Turnstile onToken={setHuman} resetKey={humanReset} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
        <p className="text-xs text-muted">
          By creating an account you agree to the{" "}
          <Link href="/legal/terms" className="underline hover:text-gold-bright">Terms</Link> and{" "}
          <Link href="/legal/privacy" className="underline hover:text-gold-bright">Privacy policy</Link>.
        </p>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-gold-bright underline">
          Sign in
        </Link>
      </p>
      </div>
    </div>
  );
}
