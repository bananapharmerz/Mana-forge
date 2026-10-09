import type { Metadata, Viewport } from "next";
import OfflineNotice from "@/components/OfflineNotice";
import BackToTop from "@/components/BackToTop";
import { SITE } from "@/lib/site";
import { Geist, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import AuthProvider from "@/components/AuthProvider";
import CartProvider from "@/components/CartProvider";
import ProxyProjectProvider from "@/components/ProxyProjectProvider";
import { CardSelectionProvider } from "@/components/CardSelectionContext";
import CardSelectionTray from "@/components/CardSelectionTray";
import { display } from "./fonts";
import ForgeIntro, { INTRO_SCRIPT } from "@/components/fx/ForgeIntro";
import SiteTracker from "@/components/SiteTracker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Site-wide SEO. Pages add their own title (shown as "Page · Site name") and description.
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  // Google AdSense site verification (a meta tag only; no ad scripts load until ads are enabled).
  other: { "google-adsense-account": "ca-pub-5292825630246496" },
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  openGraph: { type: "website", siteName: SITE.name, locale: "en_US", title: SITE.name, description: SITE.description },
  twitter: { card: "summary_large_image", title: SITE.name, description: SITE.description, ...(SITE.twitter ? { site: SITE.twitter } : {}) },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

// interactiveWidget: when the phone keyboard opens, the page shrinks to fit above it instead of the
// keyboard covering the field being typed in.
export const viewport: Viewport = { themeColor: SITE.themeColor, interactiveWidget: "resizes-content" };

// Tells search engines what the site is and how to search it.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${SITE.url}/#website`, url: SITE.url, name: SITE.name, description: SITE.description, potentialAction: { "@type": "SearchAction", target: `${SITE.url}/commanders?q={search_term_string}`, "query-input": "required name=search_term_string" } },
    { "@type": "Organization", "@id": `${SITE.url}/#org`, name: SITE.name, url: SITE.url, logo: `${SITE.url}/icon` },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before first paint: marks JS as available and skips the intro after the first page of a visit. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="sr-only z-[200] rounded-md bg-gold px-4 py-2 font-semibold text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Skip to content
        </a>
        <ForgeIntro />
        <AuthProvider>
          <CartProvider>
            <ProxyProjectProvider>
              <CardSelectionProvider>
                <Nav />
                <main id="main" tabIndex={-1} className="flex-1 outline-none">{children}</main>
                <Footer />
                <CardSelectionTray />
                <BackToTop />
                <OfflineNotice />
                <SiteTracker />
              </CardSelectionProvider>
            </ProxyProjectProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
