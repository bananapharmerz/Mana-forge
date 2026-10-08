"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Light trails between the story and the feature grid: ribbons of mana-coloured light streak
// across behind a headline. They run fastest while the section is in the middle of the screen.

const clamp = (x: number) => Math.min(1, Math.max(0, x));

export default function ForgeTrails() {
  const wrap = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // 0 as the section enters at the bottom, 1 as it leaves at the top.
      progressRef.current = clamp((window.innerHeight - r.top) / (window.innerHeight + r.height));
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
      const { mountTrails } = await import("./trailsScene");
      if (cancelled || !host.current) return;
      try {
        dispose = mountTrails(host.current, () => progressRef.current, { still: prefersReducedMotion() });
        requestAnimationFrame(() => setReady(true));
      } catch {}
    })();
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return (
    <section ref={wrap} className="relative h-[85vh] min-h-[520px] overflow-hidden bg-[#07050c] text-[#f3e9cf]" aria-label="Every color, one forge">
      {/* Fallback glow when WebGL isn't available */}
      <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(60% 50% at 50% 50%, rgba(224,178,82,0.12), transparent 70%), linear-gradient(100deg, transparent 20%, rgba(61,143,224,0.08) 45%, rgba(255,81,48,0.08) 60%, transparent 80%)" }} />
      <div ref={host} aria-hidden className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#07050c] to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#07050c] to-transparent" />
      <div className="relative z-[2] mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.4em] text-[#e0b252]">Five colors · one hundred cards</p>
        <h2 className="font-display text-5xl font-semibold leading-[0.95] drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)] sm:text-7xl">
          Every color.
          <br />
          <span className="bg-gradient-to-r from-[#ffe2a8] via-[#e0b252] to-[#ff7a2e] bg-clip-text text-transparent">One forge.</span>
        </h2>
        <p className="mt-5 max-w-md text-base text-[#d8ccb0]/85 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
          Pick a commander, pull in the colors it allows, and forge a deck that&apos;s yours.
        </p>
        <Link
          href="/deck-builder"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#e0b252] px-6 py-3 text-sm font-semibold text-[#1a1206] shadow-[0_0_40px_-8px_rgba(224,178,82,0.8)] transition-transform hover:-translate-y-0.5"
        >
          Start forging <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
