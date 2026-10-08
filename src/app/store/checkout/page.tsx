"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { createCheckoutSession } from "@/app/actions/checkout";
import { formatCents } from "@/lib/money";

export default function CheckoutPage() {
  const { items, totalCents } = useCart();
  const { data: session } = useSession();
  // Prefill with the signed-in email until the shopper types their own.
  const [typedEmail, setEmail] = useState<string | null>(null);
  const email = typedEmail ?? session?.user?.email ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    setNotConfigured(false);

    const result = await createCheckoutSession(items, email);

    if (!result.ok) {
      setError(result.error);
      setNotConfigured(!result.configured);
      setLoading(false);
      return;
    }

    window.location.href = result.url;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <p className="text-muted">Your cart is empty.</p>
        <Link href="/store" className="mt-4 inline-block text-gold-bright underline">
          Browse the store
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <Link href="/store/cart" className="text-xs text-muted underline hover:text-gold-bright">
        ← Back to cart
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-foreground">Checkout</h1>

      <div className="card-frame mt-6 flex flex-col gap-2 p-4">
        {items.map((item) => (
          <div key={item.productId} className="flex justify-between text-sm">
            <span className="text-muted">
              {item.quantity}x {item.name}
            </span>
            <span className="text-foreground">
              {formatCents(item.priceCents * item.quantity)}
            </span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-bold">
          <span className="text-foreground">Total</span>
          <span className="text-gold-bright">{formatCents(totalCents)}</span>
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

      {error && (
        <div
          className={`mt-4 rounded-md p-3 text-sm ${
            notConfigured
              ? "bg-surface-raised text-muted"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="mt-6 w-full rounded-lg bg-gold px-4 py-3 text-sm font-semibold text-black hover:bg-gold-bright disabled:opacity-50"
      >
        {loading ? "Redirecting to Stripe..." : "Pay with Stripe"}
      </button>
    </div>
  );
}
