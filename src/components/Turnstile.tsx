"use client";

import { useEffect, useRef, useState } from "react";
import { getTurnstileSiteKey } from "@/app/actions/auth";

// The Turnstile widget. Renders nothing (and onToken gets "") while Turnstile isn't switched on.
// "interaction-only": most people never see it; it only shows a checkbox when Cloudflare isn't sure.
declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; reset: (id?: string) => void; remove: (id: string) => void };
  }
}

let scriptLoading: Promise<void> | null = null;
function loadScript() {
  if (window.turnstile) return Promise.resolve();
  scriptLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile"));
    document.head.appendChild(s);
  });
  return scriptLoading;
}

export default function Turnstile({ onToken, resetKey = 0 }: { onToken: (t: string) => void; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const tokenCb = useRef(onToken);
  useEffect(() => {
    tokenCb.current = onToken;
  });

  useEffect(() => {
    let alive = true;
    getTurnstileSiteKey()
      .then((k) => alive && setSiteKey(k))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!siteKey || !box.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        widget.current = window.turnstile.render(box.current, {
          sitekey: siteKey,
          appearance: "interaction-only",
          theme: "light",
          callback: (t: string) => tokenCb.current(t),
          "expired-callback": () => tokenCb.current(""),
          "error-callback": () => tokenCb.current(""),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey]);

  // A used token can't be reused: after a failed attempt the form bumps resetKey for a fresh one.
  useEffect(() => {
    if (resetKey && widget.current && window.turnstile) window.turnstile.reset(widget.current);
  }, [resetKey]);

  if (!siteKey) return null;
  return <div ref={box} className="min-h-0" />;
}
