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
  {
    key: "Content-Security-Policy",
    value: [
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com https://accounts.google.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  // A script policy in report-only mode: browsers block nothing, they only tell /api/csp-report
  // when a script comes from somewhere not on this list (Nexus's Police Station counts them).
  // Deliberately without nonces, so every page stays static; 'unsafe-inline' covers Next's own
  // inline bootstrap and the theme script. Once the reports are quiet this can be enforced, and a
  // nonce version (which makes pages dynamic) is a separate decision.
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      [
        "script-src 'self' 'unsafe-inline'",
        // Next's dev server uses eval for hot reload; production never does.
        process.env.NODE_ENV === "development" ? "'unsafe-eval'" : "",
        // Cloudflare Turnstile (src/components/Turnstile.tsx)
        "https://challenges.cloudflare.com",
        // Google AdSense (src/components/AdSlot.tsx) and the scripts it loads itself
        "https://*.googlesyndication.com https://*.googletagservices.com https://*.googleadservices.com",
        "https://*.doubleclick.net https://*.adtrafficquality.google https://fundingchoicesmessages.google.com https://www.google.com",
      ]
        .filter(Boolean)
        .join(" "),
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
