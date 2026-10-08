"use client";

import { Fragment, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  createPremiumCheckoutSession,
  createBillingPortalSession,
  getMyTier,
} from "@/app/actions/premium";
import { PREMIUM_PRICE_CENTS } from "@/lib/tier";
import { formatCents } from "@/lib/money";
import { SITE } from "@/lib/site";

const BENEFITS = [
  { feature: "Saved decks", free: "Up to 10", premium: "Unlimited" },
  { feature: "Ads", free: "Shown across the site", premium: "None, anywhere" },
  { feature: "Starting a game", free: "30s wait", premium: "Instant" },
];

export default function PremiumPage() {
  const { status } = useSession();
  const [fetchedTier, setTier] = useState<string | null | undefined>(undefined);
  // Signed out means no tier; signed in shows whatever the server returned (undefined while loading).
  const tier = status === "unauthenticated" ? null : fetchedTier;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [startNow, setStartNow] = useState(false);

  useEffect(() => {
    if (status === "authenticated") getMyTier().then(setTier);
  }, [status]);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    setNotConfigured(false);
    const result = await createPremiumCheckoutSession(startNow);
    if (!result.ok) {
      setError(result.error);
      setNotConfigured(!result.configured);
      setLoading(false);
      return;
    }
    window.location.href = result.url;
  }

  async function handleManageBilling() {
    setLoading(true);
    setError(null);
    const result = await createBillingPortalSession();
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    window.location.href = result.url;
  }

  const isPremium = tier === "premium";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground">{SITE.name} Premium</h1>
        <p className="mt-2 text-muted">
          {formatCents(PREMIUM_PRICE_CENTS)}/month — unlimited decks, no ads, instant games.
        </p>
      </div>

      <div className="card-frame mt-8 overflow-hidden">
        <div className="grid grid-cols-3 gap-px bg-border text-sm">
          <div className="bg-surface p-3 font-semibold text-muted">Feature</div>
          <div className="bg-surface p-3 text-center font-semibold text-muted">Free</div>
          <div className="bg-surface p-3 text-center font-semibold text-gold-bright">
            Premium
          </div>
          {BENEFITS.map((b) => (
            <Fragment key={b.feature}>
              <div className="bg-surface p-3 text-foreground">{b.feature}</div>
              <div className="bg-surface p-3 text-center text-xs text-muted">{b.free}</div>
              <div className="bg-surface p-3 text-center text-xs font-medium text-gold-bright">
                {b.premium}
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      {tier === undefined && status !== "unauthenticated" && (
        <p className="mt-6 text-center text-sm text-muted">Loading your account...</p>
      )}

      {status === "unauthenticated" && (
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login?callbackUrl=/premium" className="text-gold-bright underline">
            Sign in
          </Link>{" "}
          to upgrade.
        </p>
      )}

      {status === "authenticated" && tier !== undefined && (
        <div className="mt-8 text-center">
          {isPremium ? (
            <>
              <p className="mb-4 text-sm font-medium text-gold-bright">
                You&apos;re on Premium. Thanks for supporting {SITE.name}!
              </p>
              <button
                onClick={handleManageBilling}
                disabled={loading}
                className="rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground hover:border-gold disabled:opacity-50"
              >
                {loading ? "Loading..." : "Manage Billing"}
              </button>
              <p className="mt-3 text-xs">
                <Link href="/cancel" className="text-muted underline hover:text-gold-bright">Cancel subscription</Link>
              </p>
            </>
          ) : (
            <>
            <label className="mx-auto mb-4 flex max-w-md items-start gap-2 text-left text-xs text-muted">
              <input
                type="checkbox"
                checked={startNow}
                onChange={(e) => setStartNow(e.target.checked)}
                className="mt-0.5 accent-[var(--color-gold)]"
              />
              <span>
                Start Premium straight away. I understand that my 14-day right of withdrawal ends once
                Premium starts. It renews monthly and I can{" "}
                <Link href="/cancel" className="underline hover:text-gold-bright">cancel any time</Link>; I keep
                Premium until the end of the month I paid for. See the{" "}
                <Link href="/legal/terms" className="underline hover:text-gold-bright">Terms</Link>.
              </span>
            </label>
            <button
              onClick={handleUpgrade}
              disabled={loading || !startNow}
              className="rounded-lg bg-gold px-8 py-3 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
            >
              {loading ? "Redirecting to Stripe..." : `Upgrade for ${formatCents(PREMIUM_PRICE_CENTS)}/mo`}
            </button>
            </>
          )}
        </div>
      )}

      {error && (
        <div
          className={`mt-4 rounded-md p-3 text-center text-sm ${
            notConfigured ? "bg-surface-raised text-muted" : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {error}
        </div>
      )}
    </div>
  );
}
