"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";

// Where each spark flies, in px from the button's centre.
const SPARKS: [number, number][] = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  const r = 34 + (i % 3) * 12;
  return [Math.round(Math.cos(a) * r * 1.6), Math.round(Math.sin(a) * r)];
});

export default function AddToCartButton({
  productId,
  name,
  priceCents,
  icon,
}: {
  productId: string;
  name: string;
  priceCents: number;
  icon: string;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [burst, setBurst] = useState(0); // bumps on each click to replay the sparks

  return (
    <button
      onClick={() => {
        addItem({ productId, name, priceCents, icon });
        setAdded(true);
        setBurst((b) => b + 1);
        setTimeout(() => setAdded(false), 1200);
      }}
      className="relative w-full rounded-md bg-gold px-3 py-2 text-sm font-semibold text-black transition-transform hover:bg-gold-bright active:scale-[0.97]"
    >
      {added ? "Added ✓" : "Add to Cart"}
      {burst > 0 && (
        <span key={burst} aria-hidden className="pointer-events-none absolute inset-0">
          {SPARKS.map(([x, y], i) => (
            <span key={i} className="spark" style={{ ["--sx" as string]: `${x}px`, ["--sy" as string]: `${y}px`, animationDelay: `${(i % 3) * 25}ms` }} />
          ))}
        </span>
      )}
    </button>
  );
}
