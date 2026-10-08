"use client";

import { useEffect, useRef } from "react";
import { ADS_ENABLED, ADSENSE_CLIENT, ADSENSE_SLOTS } from "@/lib/features";

// An ad space. With ads off (the default) it shows a quiet placeholder; with NEXT_PUBLIC_ADS_ENABLED=1
// and an ad unit ID it shows a Google AdSense unit. Premium members never see either.
// Google's own consent message (AdSense → Privacy & messaging) asks EU visitors first.

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

function loadAdsense() {
  if (document.querySelector("script[data-adsense]")) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  s.crossOrigin = "anonymous";
  s.dataset.adsense = "1";
  document.head.appendChild(s);
}

export default function AdSlot({
  tier,
  variant = "banner",
}: {
  tier: string | null | undefined;
  variant?: "banner" | "square";
}) {
  const slot = ADSENSE_SLOTS[variant];
  const live = ADS_ENABLED && !!slot && tier !== "premium";
  const pushed = useRef(false);

  useEffect(() => {
    if (!live || pushed.current) return;
    pushed.current = true;
    loadAdsense();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // an ad blocker or a slow script: the space just stays empty
    }
  }, [live]);

  if (tier === "premium") return null;

  if (live) {
    return (
      <div className={`card-frame overflow-hidden ${variant === "banner" ? "min-h-24" : "aspect-square"}`}>
        <ins
          className="adsbygoogle block"
          style={{ display: "block" }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format={variant === "banner" ? "horizontal" : "rectangle"}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  return (
    <div
      className={`card-frame flex items-center justify-center border-dashed p-4 text-center text-xs text-muted ${
        variant === "banner" ? "min-h-16" : "aspect-square"
      }`}
    >
      Advertisement — Premium removes ads across the whole site.
    </div>
  );
}
