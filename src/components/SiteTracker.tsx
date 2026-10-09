"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Sends anonymous page statistics to /api/a: which page, where the visitor came from, how long they
// stayed, how far they scrolled and what they clicked. No cookies, no browser storage, no IDs.
// Visitors with Do Not Track or Global Privacy Control switched on aren't counted at all.

function send(data: Record<string, unknown>) {
  try {
    const body = JSON.stringify(data);
    if (navigator.sendBeacon) navigator.sendBeacon("/api/a", new Blob([body], { type: "text/plain" }));
    else void fetch("/api/a", { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } });
  } catch {
    /* never mind */
  }
}

const optedOut = () =>
  typeof navigator !== "undefined" && (navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true);

export default function SiteTracker() {
  const pathname = usePathname();
  const page = useRef<{ path: string; start: number; scroll: number; sent: boolean } | null>(null);

  useEffect(() => {
    if (optedOut()) return;
    const leave = () => {
      const p = page.current;
      if (!p || p.sent) return;
      p.sent = true;
      send({ k: "leave", p: p.path, ms: Date.now() - p.start, sc: p.scroll });
    };
    const onScroll = () => {
      const p = page.current;
      if (!p) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 100;
      if (pct > p.scroll) p.scroll = Math.min(100, pct);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") leave();
    };
    // Rage clicks: three clicks within a second on the same spot means something didn't respond
    // the way the visitor expected. Reported once per spot per page view.
    let recent: { x: number; y: number; t: number }[] = [];
    const raged = new Set<string>();
    const onAnyClick = (e: MouseEvent) => {
      const now = e.timeStamp;
      recent = recent.filter((c) => now - c.t < 1000 && Math.abs(c.x - e.clientX) < 30 && Math.abs(c.y - e.clientY) < 30);
      recent.push({ x: e.clientX, y: e.clientY, t: now });
      if (recent.length < 3 || !page.current) return;
      const target = e.target as HTMLElement | null;
      const el = (target?.closest?.("a, button, [data-track], img, h1, h2, h3, label, li, td, p, div") as HTMLElement | null) ?? target;
      const label = (el?.dataset?.track || el?.getAttribute?.("aria-label") || el?.getAttribute?.("alt") || el?.textContent || el?.tagName || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 50);
      const key = `${page.current.path}|${label}`;
      if (!label || raged.has(key)) return;
      raged.add(key);
      recent = [];
      send({ k: "click", p: page.current.path, t: `rage: ${label}` });
    };
    const onClick = (e: MouseEvent) => {
      onAnyClick(e);
      const el = (e.target as Element | null)?.closest?.("a, button, [data-track]") as HTMLElement | null;
      if (!el || !page.current) return;
      let t = el.dataset.track ?? "";
      if (!t && el instanceof HTMLAnchorElement) {
        try {
          const u = new URL(el.href, location.href);
          t = u.host === location.host ? `→ ${u.pathname}` : `↗ ${u.host}`;
        } catch {
          t = "";
        }
      }
      if (!t) t = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
      if (t) send({ k: "click", p: page.current.path, t });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", leave);
    document.addEventListener("click", onClick, { capture: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", leave);
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (optedOut() || !pathname) return;
    // Leaving the previous page inside the site counts as a "leave" for that page too.
    const prev = page.current;
    if (prev && !prev.sent) send({ k: "leave", p: prev.path, ms: Date.now() - prev.start, sc: prev.scroll });
    page.current = { path: pathname, start: Date.now(), scroll: 0, sent: false };
    const params = new URLSearchParams(location.search);
    send({ k: "view", p: pathname, r: prev ? "" : document.referrer, s: params.get("utm_source") ?? params.get("ref") ?? "" });
  }, [pathname]);

  // When the tab comes back after being hidden, start a fresh "visit" of this page.
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState === "visible" && page.current?.sent) page.current = { path: page.current.path, start: Date.now(), scroll: page.current.scroll, sent: false };
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, []);

  return null;
}
