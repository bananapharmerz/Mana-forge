"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AddToCartButton from "@/components/AddToCartButton";
import CursorGlow from "@/components/fx/CursorGlow";
import { formatCents } from "@/lib/money";
import { SITE } from "@/lib/site";

// A Regent-style product reveal: the product sits under a spotlight while you scroll through
// four chapters (name → story → close-up → reserve). Only real product data is shown.

export interface ShowcaseProduct {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category: string;
  icon: string;
  stock: number;
}

const CATEGORY: Record<string, string> = {
  sleeves: "Sleeves",
  deckbox: "Deck Boxes",
  playmat: "Playmats",
  dice: "Dice",
  "life-counter": "Life Counters",
};

const LINES: Record<string, [string, string]> = {
  deckbox: ["A home for every deck.", "Your hundred cards, carried like they matter."],
  sleeve: ["Every card, protected.", "Shuffle after shuffle, game after game."],
  playmat: ["Your battlefield.", "Lay it out, and the table is yours."],
  dice: ["Roll with intent.", "A full set for counters, tokens and tough calls."],
  spindown: ["Count every life point.", "Forty to zero, one turn at a time."],
};

const clamp = (x: number) => Math.min(1, Math.max(0, x));
// Opacity for a chapter shown between a and b (fading over the edges).
const chapter = (p: number, a: number, b: number, edge = 0.06) => clamp(Math.min((p - a) / edge, (b - p) / edge, 1));

export default function ProductShowcase({ product, eyebrow, detailHref, skipHref }: { product: ShowcaseProduct; eyebrow?: string; detailHref?: string; skipHref?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [p, setP] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const v = clamp(-r.top / Math.max(1, total));
      progressRef.current = v;
      setP(v);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const { webglAvailable, prefersReducedMotion } = await import("./stage");
      if (!webglAvailable()) return;
      const { mountShowcase } = await import("./showcaseScene");
      if (cancelled || !host.current) return;
      try {
        dispose = mountShowcase(host.current, product, () => progressRef.current, { still: prefersReducedMotion() });
        requestAnimationFrame(() => setReady(true));
      } catch {}
    })();
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [product]);

  const [headline, sub] = LINES[product.icon] ?? ["Forged for the table.", "Made for long Commander nights."];
  const inStock = product.stock > 0;
  const story = product.description.trim() || sub;

  return (
    <section ref={wrap} className="relative h-[320vh] bg-[#07050c] text-[#f3e9cf]" aria-label={`${product.name} showcase`}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(55% 60% at 50% 35%, rgba(255,240,210,0.08), transparent 70%)" }} />
        <div ref={host} aria-hidden className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`} />
        <CursorGlow color="255,236,200" size={460} />

        {/* Chapter 1: the name */}
        <div className="pointer-events-none absolute inset-x-0 top-[24%] px-6 text-center transition-opacity duration-300 sm:top-[12%]" style={{ opacity: chapter(p, -1, 0.2) }}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.4em] text-[#e0b252]">{eyebrow ?? CATEGORY[product.category] ?? product.category}</p>
          <h2 className="font-display text-5xl font-semibold leading-none sm:text-7xl">{product.name}</h2>
          <p className="mt-4 font-display text-lg italic text-[#cbbf9f]">{headline}</p>
        </div>
        {skipHref && (
          <a
            href={skipHref}
            className="absolute right-4 top-4 rounded-full border border-white/15 px-3 py-1 text-[11px] text-[#cbbf9f] transition-colors hover:border-[#e0b252]/60 hover:text-[#ffe2a8]"
            style={{ opacity: p < 0.9 ? 1 : 0 }}
          >
            Skip to all products ↓
          </a>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-8 text-center text-[10px] uppercase tracking-[0.35em] text-[#8f8468]" style={{ opacity: chapter(p, -1, 0.12) }}>
          Scroll
          <div className="mx-auto mt-2 h-8 w-px animate-pulse bg-gradient-to-b from-[#e0b252] to-transparent" />
        </div>

        {/* Chapter 2: the story */}
        <div className="pointer-events-none absolute bottom-[14%] left-6 max-w-sm sm:left-[8%] md:bottom-auto md:top-1/3" style={{ opacity: chapter(p, 0.22, 0.46) }}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#e0b252]">Forged in {SITE.name}</p>
          <p className="font-display text-3xl leading-tight sm:text-4xl">{sub}</p>
          <p className="mt-4 text-sm leading-relaxed text-[#cbbf9f]">{story}</p>
        </div>

        {/* Chapter 3: close-up */}
        <div className="pointer-events-none absolute bottom-[14%] right-6 max-w-xs text-right sm:right-[8%] md:bottom-auto md:top-[38%]" style={{ opacity: chapter(p, 0.48, 0.7) }}>
          <p className="font-display text-4xl italic leading-tight sm:text-5xl">Every detail, up close.</p>
          <p className="mt-3 text-sm text-[#cbbf9f]">Turn it in the light.</p>
        </div>

        {/* Chapter 4: reserve */}
        <div className="absolute inset-x-6 bottom-[10%] sm:inset-x-auto sm:right-[8%] sm:top-1/2 sm:w-[22rem] sm:-translate-y-1/2" style={{ opacity: chapter(p, 0.74, 2), pointerEvents: p > 0.74 ? "auto" : "none" }}>
          <div className="rounded-2xl border border-[#e0b252]/25 bg-[#0d0a14]/80 p-6 shadow-[0_0_60px_-20px_rgba(224,178,82,0.5)] backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#e0b252]">{CATEGORY[product.category] ?? product.category}</p>
            <h3 className="mt-1 font-display text-3xl font-semibold leading-tight">{product.name}</h3>
            <p className="mt-4 font-display text-5xl font-semibold text-[#ffe2a8]">{formatCents(product.priceCents)}</p>
            <p className={`mt-1 text-xs ${inStock ? "text-emerald-300/90" : "text-red-300"}`}>
              {inStock ? (product.stock <= 5 ? `Only ${product.stock} left` : "In stock") : "Sold out"}
            </p>
            <div className="mt-5">
              {inStock ? (
                <AddToCartButton productId={product.id} name={product.name} priceCents={product.priceCents} icon={product.icon} />
              ) : (
                <button disabled className="w-full cursor-not-allowed rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white/50">Sold out</button>
              )}
            </div>
            {detailHref && (
              <Link href={detailHref} className="mt-3 block text-center text-xs text-[#cbbf9f] underline-offset-4 hover:text-[#ffe2a8] hover:underline">
                View details
              </Link>
            )}
          </div>
        </div>

        {/* Progress rail */}
        <div aria-hidden className="absolute bottom-0 left-0 h-px bg-gradient-to-r from-[#e0b252] to-[#ff7a2e]" style={{ width: `${p * 100}%` }} />
      </div>
    </section>
  );
}
