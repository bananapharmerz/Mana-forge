"use client";

import { useRef, type ReactNode } from "react";

// Tilts a card toward the cursor with a holo-foil sheen, like turning a foil in the light.
// Mouse/pen only; touch and reduced-motion users get the card as-is.

export default function FoilTilt({ children, className = "" }: { children: ReactNode; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || !el.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const s = el.current?.style;
      if (!s) return;
      s.setProperty("--rx", `${(0.5 - y) * 14}deg`);
      s.setProperty("--ry", `${(x - 0.5) * 18}deg`);
      s.setProperty("--mx", `${x * 100}%`);
      s.setProperty("--my", `${y * 100}%`);
      s.setProperty("--foil", "1");
    });
  };
  const onLeave = () => {
    cancelAnimationFrame(frame.current);
    const s = el.current?.style;
    if (!s) return;
    s.setProperty("--rx", "0deg");
    s.setProperty("--ry", "0deg");
    s.setProperty("--foil", "0");
  };

  return (
    <div ref={el} onPointerMove={onMove} onPointerLeave={onLeave} className={`foil-tilt ${className}`}>
      {children}
      <span aria-hidden className="foil-sheen" />
    </div>
  );
}
