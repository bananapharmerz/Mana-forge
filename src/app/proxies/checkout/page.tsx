"use client";

import { useState, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useProxyProject } from "@/components/ProxyProjectProvider";
import { createProxyCheckoutSession, type ShippingAddress } from "@/app/actions/proxyCheckout";
import {
  DECK_BUNDLE_MAX_CARDS,
  DECK_BUNDLE_PRICE_CENTS,
  PRICE_PER_CARD_CENTS,
  proxyTotalCents,
  type PricingMode,
} from "@/lib/proxyTypes";
import { formatCents } from "@/lib/money";

const noopSubscribe = () => () => {};

const emptyAddress: ShippingAddress = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "United States",
};

export default function ProxyCheckoutPage() {
  const { cards, totalCount } = useProxyProject();
  const { data: session } = useSession();
  // Prefill with the signed-in email until the buyer types their own.
  const [typedEmail, setEmail] = useState<string | null>(null);
  const email = typedEmail ?? session?.user?.email ?? "";
  const [address, setAddress] = useState<ShippingAddress>(emptyAddress);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const hasCustomArt = cards.some((c) => c.isCustomArt);
  const [artRights, setArtRights] = useState(false);
  // ?mode=bundle preselects the deck bundle; the buyer's own choice wins after that.
  const urlMode = useSyncExternalStore(
    noopSubscribe,
    () => new URLSearchParams(window.location.search).get("mode"),
    () => null
  );
  const [chosenMode, setPricingMode] = useState<PricingMode | null>(null);
  const pricingMode: PricingMode = chosenMode ?? (urlMode === "bundle" ? "bundle" : "per-card");

  function setField<K extends keyof ShippingAddress>(key: K, value: string) {
    setAddress((a) => ({ ...a, [key]: value }));
  }

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    setNotConfigured(false);

    const result = await createProxyCheckoutSession(cards, email, address, pricingMode, artRights);

    if (!result.ok) {
      setError(result.error);
      setNotConfigured(!result.configured);
      setLoading(false);
      return;
    }

    window.location.href = result.url;
  }

  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <p className="text-muted">Your proxy project is empty.</p>
        <Link href="/proxies" className="mt-4 inline-block text-gold-bright underline">
          Build a project
        </Link>
      </div>
    );
  }

  const bundleEligible = totalCount > 0 && totalCount <= DECK_BUNDLE_MAX_CARDS;
  const effectiveMode: PricingMode = bundleEligible ? pricingMode : "per-card";
  const totalCents = proxyTotalCents(totalCount, effectiveMode);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <Link href="/proxies" className="text-xs text-muted underline hover:text-gold-bright">
        ← Back to project
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-foreground">Order Proxies</h1>

      <div className="card-frame mt-6 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted">{totalCount} custom proxy cards</span>
          <span className="font-bold text-gold-bright">{formatCents(totalCents)}</span>
        </div>
        <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input
              type="radio"
              checked={effectiveMode === "per-card"}
              onChange={() => setPricingMode("per-card")}
            />
            Per card — {formatCents(PRICE_PER_CARD_CENTS)} each
          </label>
          <label
            className={`flex items-center gap-2 text-xs ${
              bundleEligible ? "text-foreground" : "text-muted opacity-50"
            }`}
          >
            <input
              type="radio"
              checked={effectiveMode === "bundle"}
              disabled={!bundleEligible}
              onChange={() => setPricingMode("bundle")}
            />
            Whole deck bundle — {formatCents(DECK_BUNDLE_PRICE_CENTS)} flat (up to{" "}
            {DECK_BUNDLE_MAX_CARDS} cards)
          </label>
        </div>
      </div>

      <label className="mt-6 mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
        Email for receipt
      </label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
      />

      <h2 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Shipping Address
      </h2>
      <div className="flex flex-col gap-2">
        <input
          value={address.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="Full name"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
        />
        <input
          value={address.line1}
          onChange={(e) => setField("line1", e.target.value)}
          placeholder="Address line 1"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
        />
        <input
          value={address.line2}
          onChange={(e) => setField("line2", e.target.value)}
          placeholder="Address line 2 (optional)"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={address.city}
            onChange={(e) => setField("city", e.target.value)}
            placeholder="City"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
          />
          <input
            value={address.state}
            onChange={(e) => setField("state", e.target.value)}
            placeholder="State / Province"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={address.postalCode}
            onChange={(e) => setField("postalCode", e.target.value)}
            placeholder="Postal code"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
          />
          <input
            value={address.country}
            onChange={(e) => setField("country", e.target.value)}
            placeholder="Country"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      {hasCustomArt && (
        <label className="mt-4 flex items-start gap-2 text-sm text-foreground">
          <input type="checkbox" className="mt-1" checked={artRights} onChange={(e) => setArtRights(e.target.checked)} />
          <span>
            I own the custom art I uploaded, or have permission to print it. See our{" "}
            <a href="/legal/copyright" className="text-gold-bright underline">
              copyright policy
            </a>
            .
          </span>
        </label>
      )}

      {error && (
        <div
          className={`mt-4 rounded-md p-3 text-sm ${
            notConfigured ? "bg-surface-raised text-muted" : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading || (hasCustomArt && !artRights)}
        className="mt-6 w-full rounded-lg bg-gold px-4 py-3 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
      >
        {loading ? "Redirecting to Stripe..." : "Pay with Stripe"}
      </button>
    </div>
  );
}
