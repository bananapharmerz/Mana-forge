"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CursorGlow from "@/components/fx/CursorGlow";

// Homepage hero: a dark, cinematic band with a floating Mana Forge card in a mana vortex,
// fading into the parchment site below. three.js loads only in the browser, after first paint.

export default function ForgeHero({ stats }: { stats: { label: string; value: string }[] }) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [noGl, setNoGl] = useState(false);
  const copy = useRef<HTMLDivElement>(null);

  // Parallax: the headline drifts up and fades a little slower than the page scrolls.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 900);
        if (copy.current) {
          copy.current.style.transform = `translate3d(0, ${y * -0.18}px, 0)`;
          copy.current.style.opacity = String(Math.max(0, 1 - y / 700));
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const { webglAvailable, prefersReducedMotion } = await import("./stage");
      if (!webglAvailable()) return setNoGl(true);
      const { mountHero } = await import("./heroScene");
      if (cancelled || !host.current) return;
      try {
        dispose = mountHero(host.current, { still: prefersReducedMotion() });
        requestAnimationFrame(() => setReady(true));
      } catch {
        setNoGl(true);
      }
    })();
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return (
    <section className="relative isolate overflow-hidden bg-[#09060f] text-[#f3e9cf]">
      {/* Backdrop glow, also the fallback when 3D isn't available. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 55% at 72% 45%, rgba(193,65,12,0.35), transparent 60%), radial-gradient(50% 60% at 20% 20%, rgba(91,42,134,0.45), transparent 65%), radial-gradient(80% 60% at 50% 110%, rgba(224,178,82,0.18), transparent 60%)",
        }}
      />
      <div
        ref={host}
        aria-hidden
        className={`absolute inset-0 -z-10 transition-opacity duration-[1400ms] ${ready ? "opacity-100" : "opacity-0"}`}
      />
      {/* On phones the card sits above the headline; keep the text readable over it. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[62%] bg-gradient-to-b from-transparent via-[#09060f]/80 to-[#09060f] md:hidden" />
      {noGl && (
        <div aria-hidden className="absolute right-[8%] top-1/2 -z-10 hidden h-80 w-56 -translate-y-1/2 rotate-6 rounded-2xl border border-[#e0b252]/40 bg-gradient-to-b from-[#3b1d55] to-[#120a1c] shadow-[0_0_80px_-10px_rgba(255,140,40,0.6)] md:block" />
      )}

      <div className="mx-auto flex min-h-[min(86vh,800px)] max-w-7xl flex-col justify-end px-4 pb-20 pt-[70vw] sm:px-6 md:justify-center md:pb-20 md:pt-20">
        <div ref={copy} className="relative z-[2] max-w-xl will-change-transform">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-[#e0b252]">Free Commander deck builder</p>
          <h1 className="font-display text-5xl font-semibold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            Forge your next{" "}
            <span className="bg-gradient-to-br from-[#fff1c9] via-[#e0b252] to-[#b5652a] bg-clip-text italic text-transparent">Commander</span>
            {" "}deck.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[#d8ccb0]/85">
            Pick a commander and see the cards other players run with it. Build your 100 cards, see what the deck costs, then play it with friends online.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/deck-builder"
              className="rounded-lg bg-gradient-to-b from-[#f0c76a] to-[#b5872a] px-6 py-3 font-semibold text-[#1a1206] shadow-[0_0_40px_-8px_rgba(240,199,106,0.8)] transition-transform hover:scale-[1.03]"
            >
              Start building, it&apos;s free
            </Link>
            <Link
              href="/commanders"
              className="rounded-lg border border-[#e0b252]/40 px-6 py-3 font-semibold text-[#f3e9cf] backdrop-blur-sm transition-colors hover:border-[#e0b252] hover:bg-[#e0b252]/10"
            >
              Browse commanders
            </Link>
          </div>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-[#d8ccb0]/80">
            {["No sign-up to start", "Daily card prices", "Play online with friends"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <span aria-hidden className="text-[#e0b252]">✓</span>
                {t}
              </li>
            ))}
          </ul>
          {stats.length > 0 && (
            <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-[11px] uppercase tracking-[0.2em] text-[#a99a78]">{s.label}</dt>
                  <dd className="font-display text-3xl font-semibold text-[#f3e9cf]">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      <CursorGlow />
      {/* Gilded edge where the forge meets the page. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#09060f]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#e0b252] to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-[20%] bottom-0 h-6 translate-y-1/2 rounded-full bg-[#e0b252]/25 blur-xl" />
    </section>
  );
}
