"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CursorGlow from "@/components/fx/CursorGlow";
import { SITE } from "@/lib/site";
import { SHOP_ENABLED } from "@/lib/features";

// Scroll story under the hero: one cloud of mana motes that reforms for each part of the site.

const CHAPTERS = [
  {
    eyebrow: "01 · Commanders",
    title: "Find your commander.",
    body: "Every legal commander, sorted by colour identity, tribe and archetype.",
    cta: { href: "/commanders", label: "Browse commanders" },
  },
  {
    eyebrow: "02 · Deck builder",
    title: "Forge the deck.",
    body: "Start from a commander, see what other players built, and save your hundred.",
    cta: { href: "/deck-builder", label: "Start a deck" },
  },
  {
    eyebrow: "03 · Play",
    title: "Play with friends.",
    body: "A shared tabletop with life totals, hands and the battlefield, synced in real time.",
    cta: { href: "/play", label: "Open a table" },
  },
  SHOP_ENABLED
    ? {
        eyebrow: "04 · Store & proxies",
        title: "Gear up.",
        body: "Sleeves, deck boxes, playmats, dice, and custom proxies for testing.",
        cta: { href: "/store", label: "Visit the store" },
      }
    : {
        eyebrow: "04 · Premium",
        title: "Go further.",
        body: "Unlimited decks, no ads and instant games, for less than a booster a month.",
        cta: { href: "/premium", label: "See Premium" },
      },
];

const clamp = (x: number) => Math.min(1, Math.max(0, x));

export default function ForgeStory() {
  const wrap = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [p, setP] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const v = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
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
      const { mountStory } = await import("./storyScene");
      if (cancelled || !host.current) return;
      try {
        dispose = mountStory(host.current, () => progressRef.current, { still: prefersReducedMotion() });
        requestAnimationFrame(() => setReady(true));
      } catch {}
    })();
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  const f = p * (CHAPTERS.length - 1);
  const active = Math.round(f);

  return (
    <section ref={wrap} className="relative h-[400vh] bg-[#07050c] text-[#f3e9cf]" aria-label={`What you can do on ${SITE.name}`}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(50% 55% at 70% 50%, rgba(91,42,134,0.28), transparent 70%)" }} />
        <div ref={host} aria-hidden className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`} />
        <CursorGlow color="200,170,255" size={480} />

        <div className="relative z-[2] mx-auto flex h-full max-w-7xl items-end px-4 pb-[12vh] sm:px-6 md:items-center md:pb-0">
          <div className="relative h-64 w-full max-w-md">
            {CHAPTERS.map((c, i) => {
              const d = Math.abs(f - i);
              const o = clamp(1 - (d - 0.18) / 0.22);
              return (
                <div
                  key={c.title}
                  className="absolute inset-x-0 bottom-0 md:bottom-auto md:top-0"
                  style={{ opacity: o, transform: `translateY(${(f - i) * -28}px)`, pointerEvents: o > 0.6 ? "auto" : "none" }}
                  aria-hidden={i !== active}
                >
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#e0b252]">{c.eyebrow}</p>
                  <h2 className="font-display text-5xl font-semibold leading-[0.95] sm:text-6xl">{c.title}</h2>
                  <p className="mt-4 max-w-sm text-base leading-relaxed text-[#d8ccb0]/85">{c.body}</p>
                  <Link
                    href={c.cta.href}
                    tabIndex={i === active ? 0 : -1}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#e0b252]/45 px-5 py-2.5 text-sm font-semibold text-[#f3e9cf] transition-colors hover:border-[#e0b252] hover:bg-[#e0b252]/10"
                  >
                    {c.cta.label} <span aria-hidden>→</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chapter dots */}
        <div aria-hidden className="absolute right-4 top-1/2 z-[2] flex -translate-y-1/2 flex-col gap-3 sm:right-8">
          {CHAPTERS.map((c, i) => (
            <span key={c.title} className={`h-2 w-2 rounded-full transition-all ${i === active ? "scale-125 bg-[#e0b252]" : "bg-white/20"}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
