"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import {
  createPremiumCheckoutSession,
  createBillingPortalSession,
  getMyTier,
  getPriceAlerts,
  setPriceAlerts,
} from "@/app/actions/premium";
import { PREMIUM_PLANS, PREMIUM_VAT_NOTE, planPrice, type PremiumPlan } from "@/lib/tier";
import { SITE } from "@/lib/site";

const BENEFITS = [
  { feature: "Saved decks", free: "Up to 10", premium: "Unlimited" },
  { feature: "Ads", free: "Shown across the site", premium: "None, anywhere" },
  { feature: "Starting a game", free: "30s wait", premium: "Instant" },
  { feature: "Price alerts by email", free: "—", premium: "Target prices + weekly deck moves" },
  { feature: "Budget upgrade ideas", free: "—", premium: "In the deck builder" },
  { feature: "Supporter badge", free: "—", premium: "On your public decks" },
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
  const [plan, setPlan] = useState<PremiumPlan>("year");

  const [alerts, setAlerts] = useState<boolean | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    getMyTier().then(setTier);
    getPriceAlerts().then(setAlerts);
  }, [status]);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    setNotConfigured(false);
    const result = await createPremiumCheckoutSession(startNow, plan);
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
    <>
      <PageHeader
        title={`${SITE.name} Premium`}
        description={`Unlimited decks, no ads, instant games, and tools that save you money on cards. From ${planPrice("month")} a month, or ${planPrice("year")} a year.`}
        width="max-w-5xl"
      />
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="What Premium includes" className="min-w-0">
          <h2 className="font-display text-2xl font-semibold text-foreground">What you get</h2>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {BENEFITS.map((b) => (
              <li key={b.feature} className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-4">
                <div>
                  <p className="font-semibold text-foreground">{b.feature}</p>
                  <p className="mt-0.5 text-sm text-gold-bright">{b.premium}</p>
                </div>
                <p className="text-right text-xs text-muted">Free: {b.free === "—" ? "not included" : b.free.toLowerCase()}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">{PREMIUM_VAT_NOTE} Card names and images stay free for everyone.</p>
        </section>

        <aside className="card-frame h-fit min-w-0 p-5 lg:sticky lg:top-6">
          <h2 className="font-display text-2xl font-semibold text-foreground">{isPremium ? "Your plan" : "Choose a plan"}</h2>
        {tier === undefined && status !== "unauthenticated" && (
          <p className="mt-2 text-sm text-muted">Loading your account...</p>
        )}

        {status === "unauthenticated" && (
          <div className="mt-3">
            <div className="mb-4 grid grid-cols-2 gap-2">
              {(Object.keys(PREMIUM_PLANS) as PremiumPlan[]).map((k) => (
                <div key={k} className={`relative rounded-xl border p-3 ${k === "year" ? "border-gold bg-gold/10" : "border-border"}`}>
                  {PREMIUM_PLANS[k].note && (
                    <span className="absolute -top-2 right-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-black">{PREMIUM_PLANS[k].note}</span>
                  )}
                  <span className="block text-xs text-muted">{PREMIUM_PLANS[k].label}</span>
                  <span className="block text-lg font-bold text-foreground">
                    {planPrice(k)}
                    <span className="text-xs font-normal text-muted">{PREMIUM_PLANS[k].per}</span>
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/login?callbackUrl=/premium"
              className="block w-full rounded-lg bg-gold px-8 py-3 text-center text-sm font-semibold text-black hover:bg-[#d4a23e]"
            >
              Sign in to upgrade
            </Link>
            <p className="mt-2 text-center text-xs text-muted">
              New here? <Link href="/signup" className="underline hover:text-gold-bright">Create a free account</Link> first.
            </p>
          </div>
        )}

        {status === "authenticated" && tier !== undefined && (
          <div className="mt-2">
            {isPremium ? (
              <>
                <p className="mb-4 text-sm font-medium text-gold-bright">
                  You&apos;re on Premium. Thanks for supporting {SITE.name}!
                </p>
                {alerts !== null && (
                  <label className="mb-4 flex items-center justify-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={alerts}
                      onChange={async (e) => setAlerts(await setPriceAlerts(e.target.checked))}
                    />
                    Email me price alerts (watchlist targets and big weekly moves in my decks)
                  </label>
                )}
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
              <div className="mb-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Plan">
                {(Object.keys(PREMIUM_PLANS) as PremiumPlan[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={plan === k}
                    onClick={() => setPlan(k)}
                    className={`relative rounded-xl border p-3 text-left transition-colors ${plan === k ? "border-gold bg-gold/10" : "border-border hover:border-gold/60"}`}
                  >
                    {PREMIUM_PLANS[k].note && (
                      <span className="absolute -top-2 right-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-black">{PREMIUM_PLANS[k].note}</span>
                    )}
                    <span className="block text-xs text-muted">{PREMIUM_PLANS[k].label}</span>
                    <span className="block text-lg font-bold text-foreground">
                      {planPrice(k)}
                      <span className="text-xs font-normal text-muted">{PREMIUM_PLANS[k].per}</span>
                    </span>
                  </button>
                ))}
              </div>
              <label className="mb-4 flex items-start gap-2 text-left text-xs text-muted">
                <input
                  type="checkbox"
                  checked={startNow}
                  onChange={(e) => setStartNow(e.target.checked)}
                  className="mt-0.5 accent-[var(--color-gold)]"
                />
                <span>
                  Start Premium straight away. I understand that my 14-day right of withdrawal ends once
                  Premium starts. It renews every {PREMIUM_PLANS[plan].interval} and I can{" "}
                  <Link href="/cancel" className="underline hover:text-gold-bright">cancel any time</Link>; I keep
                  Premium until the end of the {PREMIUM_PLANS[plan].interval} I paid for. See the{" "}
                  <Link href="/legal/terms" className="underline hover:text-gold-bright">Terms</Link>.
                </span>
              </label>
              <button
                onClick={handleUpgrade}
                disabled={loading || !startNow}
                className="w-full rounded-lg bg-gold px-8 py-3 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
              >
                {loading ? "Redirecting to Stripe..." : `Upgrade for ${planPrice(plan)}${PREMIUM_PLANS[plan].per}`}
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
        </aside>
      </div>
    </>
  );
}
