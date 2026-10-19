import type { NextConfig } from "next";

// Security headers sent with every page. The content policy is kept deliberately small so it
// can't break the app: no plugins/embeds, no <base> tag tricks, forms may only post to us or to
// Stripe checkout, and nobody can put the site inside a frame (stops click-jacking).
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // Enforced content policy. 'unsafe-inline'/'unsafe-eval' are kept so Next's inline bootstrap, the
  // theme script and the ad / Turnstile scripts keep working (a nonce-based policy that drops them
  // is a separate, larger change). The protection here is the script-src domain allowlist — no
  // external script may load from off this list — plus object-src / base-uri / form-action /
  // frame-ancestors. Violations are still reported to /api/csp-report (Nexus's Police Station).
  {
    key: "Content-Security-Policy",
    value: [
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com https://accounts.google.com",
      "frame-ancestors 'none'",
      [
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        // Cloudflare Turnstile (src/components/Turnstile.tsx)
        "https://challenges.cloudflare.com",
        // Google AdSense (src/components/AdSlot.tsx) and the scripts it loads itself
        "https://*.googlesyndication.com https://*.googletagservices.com https://*.googleadservices.com",
        "https://*.doubleclick.net https://*.adtrafficquality.google https://fundingchoicesmessages.google.com https://www.google.com",
      ].join(" "),
      "report-uri /api/csp-report",
      "report-to csp",
    ].join("; "),
  },
  { key: "Reporting-Endpoints", value: 'csp="/api/csp-report"' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cards.scryfall.io",
      },
      {
        protocol: "https",
        hostname: "svgs.scryfall.io",
      },
    ],
    // Scryfall's CDN blocks Node's server-side fetch (used by the Next.js image
    // optimizer proxy) but serves normal browser requests fine, so skip the proxy.
    unoptimized: true,
  },
};

export default nextConfig;
