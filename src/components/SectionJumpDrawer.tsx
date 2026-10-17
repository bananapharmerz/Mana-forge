"use client";

import { useEffect, useRef, useState } from "react";

// A sticky bar of section chips that pins just under the site header and stays visible as you
// scroll the commander page. The chip for the section you're currently in is highlighted (scroll
// spy) and kept in view within the bar, so the nav "slides" along with the page. Tap a chip to
// jump to that section.
export default function SectionJumpDrawer({
  tabs,
}: {
  tabs: { id: string; label: string }[];
}) {
  const [active, setActive] = useState<string | null>(null);
  const [top, setTop] = useState(56); // header height, measured so we sit right below it
  const barRef = useRef<HTMLDivElement>(null);

  // Stick just below the (sticky) site header, whatever its current height is.
  useEffect(() => {
    const measure = () => setTop(document.querySelector("header")?.offsetHeight ?? 56);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Highlight the section currently under the bar.
  useEffect(() => {
    if (tabs.length === 0) return;
    const els = tabs
      .map((t) => document.getElementById(t.id))
      .filter((e): e is HTMLElement => !!e);
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: `-${top + 8}px 0px -55% 0px`, threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [tabs, top]);

  // Keep the active chip scrolled into view within the bar.
  useEffect(() => {
    if (!active || !barRef.current) return;
    const chip = barRef.current.querySelector<HTMLElement>(`[data-id="${active}"]`);
    chip?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  if (tabs.length === 0) return null;

  return (
    <div
      className="sticky z-30 -mx-4 mb-6 border-y border-border bg-background/95 backdrop-blur sm:-mx-6"
      style={{ top }}
    >
      <div
        ref={barRef}
        className="flex gap-2 overflow-x-auto px-4 py-2.5 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t) => (
          <a
            key={t.id}
            data-id={t.id}
            href={`#${t.id}`}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              active === t.id
                ? "border-gold bg-gold/15 text-gold-bright"
                : "border-border text-muted hover:border-gold hover:text-foreground"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>
    </div>
  );
}
