"use client";

import { useEffect, useRef } from "react";

// Forge sparks: little dots that drag a trailing line as they fly up and out across the hero,
// bursting each time Ember's hammer lands (the 1.3s forge cycle) with a steady ambient trickle in
// between so there's always something running around the page. Canvas keeps the trails cheap; the
// five mana colours plus forge gold. Holds still for people who prefer reduced motion.

const COLORS = ["#f6efd0", "#49a3e0", "#9a73d6", "#ff5a3c", "#49b56a", "#ffc061"];
const CYCLE = 1300; // ms — matches .forge-hammer
const STRIKE_PHASE = 0.5; // the hammer lands halfway through the cycle

type Spark = {
  x: number; y: number; px: number; py: number;
  vx: number; vy: number; life: number; max: number;
  color: string; size: number;
};

// Pass a positioning class (absolute inset-0 …); the canvas just fills it.
export default function ForgeSparks({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let dpr = Math.min(2, window.devicePixelRatio || 1);
    const parts: Spark[] = [];
    const MAX = 160;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };
    resize();
    window.addEventListener("resize", resize);

    // Where sparks are born: the anvil strike point, read live so it tracks any layout.
    const origin = () => {
      const r = canvas.getBoundingClientRect();
      const m = document.querySelector("[data-forge-strike]");
      if (m) {
        const mr = (m as HTMLElement).getBoundingClientRect();
        return { x: mr.left + mr.width / 2 - r.left, y: mr.top + mr.height / 2 - r.top };
      }
      return { x: r.width * 0.72, y: r.height * 0.58 };
    };

    const spawn = (n: number, burst: boolean) => {
      const o = origin();
      for (let i = 0; i < n && parts.length < MAX; i++) {
        // fan upward — mostly up, spreading to the sides; wider and faster on a hammer strike
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * (burst ? 2.5 : 1.5);
        const sp = (burst ? 2.4 : 1.0) + Math.random() * (burst ? 4.6 : 1.8);
        parts.push({
          x: o.x, y: o.y, px: o.x, py: o.y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          life: 0,
          max: 52 + Math.random() * (burst ? 72 : 48),
          color: COLORS[(Math.random() * COLORS.length) | 0],
          size: 1 + Math.random() * 1.6,
        });
      }
    };

    const t0 = performance.now();
    let lastCycle = -1;
    let ambient = 0;

    const frame = (t: number) => {
      const cyc = Math.floor((t - t0) / CYCLE);
      const phase = ((t - t0) % CYCLE) / CYCLE;
      if (cyc !== lastCycle && phase >= STRIKE_PHASE) {
        lastCycle = cyc;
        spawn(16, true); // burst on the strike
      }
      if (++ambient >= 5) { ambient = 0; spawn(1, false); } // steady trickle

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.px = p.x; p.py = p.y;
        p.vx *= 0.99; p.vy *= 0.99;
        p.vy += 0.035; // a little gravity so they arc over and roam
        p.x += p.vx; p.y += p.vy;
        p.life++;
        const a = 1 - p.life / p.max;
        if (a <= 0) { parts.splice(i, 1); continue; }
        // trailing line
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = a * 0.7;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        // bright dot at the head
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
