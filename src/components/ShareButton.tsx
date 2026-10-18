"use client";

import { useState } from "react";

// Copy-to-clipboard share button. Falls back to the native share sheet on devices that have one.
export default function ShareButton({ url, label = "Share" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    // Prefer the native share sheet on mobile; otherwise copy the link.
    const nav = navigator as Navigator & { share?: (data: { url: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ url });
        return;
      } catch {
        // User dismissed the sheet, or it failed — fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (rare); nothing else to do.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-gold"
    >
      <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="15" cy="5" r="2.2" />
        <circle cx="5" cy="10" r="2.2" />
        <circle cx="15" cy="15" r="2.2" />
        <path d="m7 9 6-3M7 11l6 3" />
      </svg>
      {copied ? "Link copied!" : label}
    </button>
  );
}
