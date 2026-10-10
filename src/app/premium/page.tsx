"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PremiumThanks from "@/components/PremiumThanks";
import {
  createPremiumCheckoutSession,
  createBillingPortalSession,
  getMyTier,
  getPriceAlerts,
  getTrialOffer,
  setPriceAlerts,
} from "@/app/actions/premium";
import { FREE_TIER_DECK_LIMIT, PREMIUM_PLANS, PREMIUM_VAT_NOTE, TRIAL_DAYS, planPrice, type PremiumPlan } from "@/lib/tier";
import { SITE } from "@/lib/site";

const BENEFITS = [
  { feature: "Saved decks", free: "Up to 10", premium: "Unlimited" },
  { feature: "Ads", free: "Shown across the site", premium: "None, anywhere" },
  { feature: "Starting a game", free: "30s wait", premium: "Instant" },
  { feature: "Price alerts by email", free: "—", premium: "Target prices + weekly deck moves" },
  { feature: "Deck value graph", free: "—", premium: "Week, month and year in the builder" },
  { feature: "Budget upgrade ideas", free: "—", premium: "In the deck builder" },
  { feature: "Deck versions", free: "—", premium: "Save, compare and restore" },
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
  const [fetchedTrial, setTrial] = useState(false);
  // Everyone signing up fresh gets the trial; signed-in members only if they've never subscribed.
  const trial = status === "unauthenticated" ? true : fetchedTrial;

  useEffect(() => {
    if (status !== "authenticated") return;
    getMyTier().then(setTier);
    getPriceAlerts().then(setAlerts);
    getTrialOffer().then(setTrial);
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
        description={`Unlimited decks, no ads, instant games, and tools that save you money on cards. Try it free for ${TRIAL_DAYS} days, then ${planPrice("month")} a month or ${planPrice("year")} a year.`}
        width="max-w-5xl"
      />
      <PremiumThanks trialDays={TRIAL_DAYS} />
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Free and Premium compared" className="min-w-0">
          <h2 className="font-display text-2xl font-semibold text-foreground">Free vs Premium</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <table className="w-full table-fixed border-collapse text-sm">
              <caption className="sr-only">What the free account and Premium include</caption>
              <colgroup>
                <col className="w-[38%]" />
                <col className="w-[27%]" />
                <col className="w-[35%]" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className="bg-surface p-3 text-left align-bottom text-xs font-semibold uppercase tracking-wide text-muted">Feature</th>
                  <th scope="col" className="bg-surface p-3 text-left align-bottom">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Free</span>
                    <span className="block font-display text-xl font-semibold text-foreground">€0</span>
                  </th>
                  <th scope="col" className="border-x-2 border-t-2 border-gold bg-gold/15 p-3 text-left align-bottom">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-gold-bright">Premium</span>
                    <span className="block font-display text-xl font-semibold text-foreground">
                      {planPrice("month")}<span className="text-xs font-normal text-muted">/mo</span>
                    </span>
                    <span className="block text-[11px] font-normal text-muted">{TRIAL_DAYS} days free</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {BENEFITS.map((b, i) => (
                  <tr key={b.feature} className="border-t border-border">
                    <th scope="row" className="p-3 text-left font-medium text-foreground">{b.feature}</th>
                    <td className="p-3 text-muted">
                      {b.free === "—" ? (
                        <span className="text-red-700/70"><span aria-hidden>✕ </span>Not included</span>
                      ) : (
                        b.free
                      )}
                    </td>
                    <td className={`border-x-2 border-gold bg-gold/10 p-3 font-medium text-foreground ${i === BENEFITS.length - 1 ? "border-b-2" : ""}`}>
                      <span aria-hidden className="text-emerald-700">✓ </span>
                      {b.premium}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              href="/signup?callbackUrl=/premium"
              className="block w-full rounded-lg bg-gold px-8 py-3 text-center text-sm font-semibold text-black hover:bg-[#d4a23e]"
            >
              Start your {TRIAL_DAYS}-day free trial
            </Link>
            <p className="mt-2 text-center text-xs text-muted">
              Free account first, then {TRIAL_DAYS} days of Premium on us. Cancel before it ends and you pay nothing.
            </p>
            <p className="mt-1 text-center text-xs text-muted">
              Already have an account? <Link href="/login?callbackUrl=/premium" className="underline hover:text-gold-bright">Sign in</Link>
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
                {trial ? (
                <span>
                  Start my {TRIAL_DAYS}-day free trial now. After it, Premium costs {planPrice(plan)}
                  {PREMIUM_PLANS[plan].per} and renews every {PREMIUM_PLANS[plan].interval} until I{" "}
                  <Link href="/cancel" className="underline hover:text-gold-bright">cancel</Link>. Cancelling before the
                  trial ends costs nothing. I understand that my 14-day right of withdrawal ends once Premium starts. See the{" "}
                  <Link href="/legal/terms" className="underline hover:text-gold-bright">Terms</Link>.
                </span>
                ) : (
                <span>
                  Start Premium straight away. I understand that my 14-day right of withdrawal ends once
                  Premium starts. It renews every {PREMIUM_PLANS[plan].interval} and I can{" "}
                  <Link href="/cancel" className="underline hover:text-gold-bright">cancel any time</Link>; I keep
                  Premium until the end of the {PREMIUM_PLANS[plan].interval} I paid for. See the{" "}
                  <Link href="/legal/terms" className="underline hover:text-gold-bright">Terms</Link>.
                </span>
                )}
              </label>
              <button
                onClick={handleUpgrade}
                disabled={loading || !startNow}
                className="w-full rounded-lg bg-gold px-8 py-3 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
              >
                {loading ? "Redirecting to Stripe..." : trial ? `Start ${TRIAL_DAYS}-day free trial` : `Upgrade for ${planPrice(plan)}${PREMIUM_PLANS[plan].per}`}
              </button>
              {trial && (
                <p className="mt-2 text-center text-xs text-muted">
                  €0 today. Then {planPrice(plan)}{PREMIUM_PLANS[plan].per}. We email you 3 days before.
                </p>
              )}
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
      <PremiumFaq />
    </>
  );
}

// Short answers to what people ask before paying. Each opens on tap, no JavaScript needed.
function PremiumFaq() {
  const qa: [string, ReactNode][] = [
    [
      "Is there a free trial?",
      <>First-time members get {TRIAL_DAYS} days free. Stripe takes your card at checkout but charges nothing until the trial ends, and we email you 3 days before. Cancel before then and you pay nothing.</>,
    ],
    [
      "How do I cancel?",
      <>Any time, on the <Link href="/cancel" className="underline hover:text-gold-bright">cancel page</Link>. You keep Premium until the end of the month or year you paid for, and you aren&apos;t charged again.</>,
    ],
    [
      "What happens to my decks if I stop Premium?",
      <>They all stay. Free accounts can keep up to {FREE_TIER_DECK_LIMIT} decks, so you can still open and edit everything; you just can&apos;t add new decks while you&apos;re over that number.</>,
    ],
    [
      "How do I pay, and is VAT added?",
      <>Payment goes through Stripe (cards and the other methods Stripe offers at checkout). Prices are in euros and are final. {PREMIUM_VAT_NOTE}</>,
    ],
    [
      "Can I switch between monthly and yearly?",
      <>Yes. Cancel your current plan, and when it runs out choose the other one. Your decks and settings stay as they are.</>,
    ],
  ];
  return (
    <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <h2 className="mb-4 font-display text-2xl font-semibold text-foreground">Questions</h2>
      <div className="divide-y divide-border rounded-xl border border-border bg-surface">
        {qa.map(([q, a]) => (
          <details key={q} className="group px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground">
              {q}
              <span aria-hidden className="text-gold transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
