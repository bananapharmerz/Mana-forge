"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CursorGlow from "@/components/fx/CursorGlow";
import { SITE } from "@/lib/site";
import { SHOP_ENABLED } from "@/lib/features";

// Under the hero: a drifting cloud of mana motes that gathers into a shape for each part of the
// site, holds it while that chapter's text shows, scatters, and gathers into the next. It plays by
// itself (no scrolling needed); the dots jump straight to a chapter.

const CHAPTERS = [
  {
    eyebrow: "01 · Commanders",
    title: "Find your commander.",
    body: "Every legal commander, sorted by colour identity, tribe and archetype.",
    cta: { href: "/commanders", label: "Browse commanders" },
  },
  {
    eyebrow: "02 · Public decks",
    title: "Borrow a deck.",
    body: "Hundreds of complete decks, from average builds to budget lists. Make any of them yours in one click.",
    cta: { href: "/decks", label: "Browse public decks" },
  },
  {
    eyebrow: "03 · Deck builder",
    title: "Forge the deck.",
    body: "Start from a commander, see what other players built, and save your hundred.",
    cta: { href: "/deck-builder", label: "Start a deck" },
  },
  {
    eyebrow: "04 · Play",
    title: "Play with friends.",
    body: "A shared tabletop with life totals, hands and the battlefield, synced in real time.",
    cta: { href: "/play", label: "Open a table" },
  },
  SHOP_ENABLED
    ? {
        eyebrow: "05 · Store & proxies",
        title: "Gear up.",
        body: "Sleeves, deck boxes, playmats, dice, and custom proxies for testing.",
        cta: { href: "/store", label: "Visit the store" },
      }
    : {
        eyebrow: "05 · Premium",
        title: "Go further.",
        body: "Unlimited decks, no ads and instant games, for less than a booster a month.",
        cta: { href: "/premium", label: "See Premium" },
      },
];

export default function ForgeStory() {
  const host = useRef<HTMLDivElement>(null);
  const story = useRef<{ goTo(c: number): void } | null>(null);
  // The chapter on screen; -1 while the motes drift between shapes.
  const [active, setActive] = useState(-1);
  const [last, setLast] = useState(0); // the dot stays lit while the cloud drifts
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    const show = (c: number) => {
      setActive(c);
      if (c >= 0) setLast(c);
    };
    (async () => {
      const { webglAvailable, prefersReducedMotion } = await import("./stage");
      if (!webglAvailable()) {
        if (!cancelled) setFallback(true);
        return;
      }
      const { mountStory } = await import("./storyScene");
      if (cancelled || !host.current) return;
      try {
        const s = mountStory(host.current, { still: prefersReducedMotion(), onChapter: show });
        story.current = s;
        dispose = s.dispose;
        requestAnimationFrame(() => setReady(true));
      } catch {
        setFallback(true);
      }
    })();
    return () => {
      cancelled = true;
      story.current = null;
      dispose?.();
    };
  }, []);

  // Without WebGL the text simply rotates on its own.
  useEffect(() => {
    if (!fallback) return;
    let c = 0;
    setActive(0);
    const timer = setInterval(() => {
      c = (c + 1) % CHAPTERS.length;
      setActive(c);
      setLast(c);
    }, 6000);
    return () => clearInterval(timer);
  }, [fallback]);

  const goTo = (i: number) => {
    if (story.current) story.current.goTo(i);
    else {
      setActive(i);
      setLast(i);
    }
  };

  return (
    <section className="relative h-screen min-h-[560px] overflow-hidden bg-[#07050c] text-[#f3e9cf]" aria-label={`What you can do on ${SITE.name}`}>
      <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(50% 55% at 70% 50%, rgba(91,42,134,0.28), transparent 70%)" }} />
      <div ref={host} aria-hidden className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`} />
      <CursorGlow color="200,170,255" size={480} />

      <div className="relative z-[2] mx-auto flex h-full max-w-7xl items-end px-4 pb-[12vh] sm:px-6 md:items-center md:pb-0">
        <div className="relative h-64 w-full max-w-md" aria-live="polite">
          {CHAPTERS.map((c, i) => {
            const on = i === active;
            return (
              <div
                key={c.title}
                className="absolute inset-x-0 bottom-0 transition-all duration-700 ease-out md:bottom-auto md:top-0"
                style={{ opacity: on ? 1 : 0, transform: `translateY(${on ? 0 : 18}px)`, pointerEvents: on ? "auto" : "none" }}
                aria-hidden={!on}
              >
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#e0b252]">{c.eyebrow}</p>
                <h2 className="font-display text-5xl font-semibold leading-[0.95] sm:text-6xl">{c.title}</h2>
                <p className="mt-4 max-w-sm text-base leading-relaxed text-[#d8ccb0]/85">{c.body}</p>
                <Link
                  href={c.cta.href}
                  tabIndex={on ? 0 : -1}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#e0b252]/45 px-5 py-2.5 text-sm font-semibold text-[#f3e9cf] transition-colors hover:border-[#e0b252] hover:bg-[#e0b252]/10"
                >
                  {c.cta.label} <span aria-hidden>→</span>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chapter dots: click to jump to a chapter. */}
      <div className="absolute right-4 top-1/2 z-[2] flex -translate-y-1/2 flex-col gap-3 sm:right-8">
        {CHAPTERS.map((c, i) => (
          <button
            key={c.title}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Show: ${c.eyebrow.replace(/^\d+ · /, "")}`}
            className="grid h-5 w-5 place-items-center"
          >
            <span className={`h-2 w-2 rounded-full transition-all ${i === last ? "scale-125 bg-[#e0b252]" : "bg-white/20 hover:bg-white/50"}`} />
          </button>
        ))}
      </div>
    </section>
  );
}
