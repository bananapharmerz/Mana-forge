"use client";

import Link from "next/link";
import ProductIcon from "@/components/ProductIcon";
import { useCart } from "@/components/CartProvider";
import { formatCents } from "@/lib/money";

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalCents } = useCart();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/store" className="text-xs text-muted underline hover:text-gold-bright">
        ← Continue shopping
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-foreground">Your Cart</h1>

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          Your cart is empty.{" "}
          <Link href="/store" className="text-gold-bright underline">
            Browse the store
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3">
            {items.map((item) => (
              <div
                key={item.productId}
                className="card-frame flex items-center gap-4 p-3"
              >
                <div className="w-16 shrink-0">
                  <ProductIcon icon={item.icon} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  <p className="text-xs text-muted">{formatCents(item.priceCents)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm text-foreground">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
                  >
                    +
                  </button>
                </div>
                <p className="w-16 text-right text-sm font-semibold text-foreground">
                  {formatCents(item.priceCents * item.quantity)}
                </p>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-xs text-muted hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="card-frame mt-6 flex items-center justify-between p-4">
            <span className="text-sm text-muted">Total</span>
            <span className="text-xl font-bold text-gold-bright">
              {formatCents(totalCents)}
            </span>
          </div>

          <Link
            href="/store/checkout"
            className="mt-6 block w-full rounded-lg bg-gold px-4 py-3 text-center text-sm font-semibold text-black hover:bg-gold-bright"
          >
            Checkout
          </Link>
        </>
      )}
    </div>
  );
}
