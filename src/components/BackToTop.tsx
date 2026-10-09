"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** A small "back to top" button on long pages (commander lists, decks, prices) once you've scrolled a way down. */
export default function BackToTop() {
  const path = usePathname();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 1400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // The home page has its own bottom bar on phones, and the play room doesn't scroll.
  if (path === "/" || path.startsWith("/play")) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      aria-label="Back to top"
      tabIndex={show ? 0 : -1}
      className={`fixed bottom-6 left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface/95 text-lg text-foreground shadow-lg backdrop-blur transition-all hover:border-gold hover:text-gold-bright ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
    >
      ↑
    </button>
  );
}
