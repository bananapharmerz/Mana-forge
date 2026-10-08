"use client";

import { useEffect, useRef } from "react";

// A soft light that follows the mouse across a dark section. Drop it inside any positioned
// (relative) container; it fills the container and ignores clicks.

export default function CursorGlow({ color = "255,196,110", size = 520 }: { color?: string; size?: number }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = el.current;
    const host = node?.parentElement;
    if (!node || !host) return;
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        node.style.opacity = "1";
        node.style.transform = `translate(${e.clientX - r.left - size / 2}px, ${e.clientY - r.top - size / 2}px)`;
      });
    };
    const leave = () => (node.style.opacity = "0");
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
    };
  }, [size]);
  return (
    <div
      ref={el}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[1] rounded-full opacity-0 mix-blend-screen transition-opacity duration-500"
      style={{ width: size, height: size, background: `radial-gradient(circle, rgba(${color},0.16) 0%, rgba(${color},0.06) 35%, transparent 70%)` }}
    />
  );
}
