// Who runs the site, for the legal pages. Set these in .env (server-only, never sent to the
// browser except where a legal page prints them on purpose):
//
//   LEGAL_OWNER="Your full name or company"
//   LEGAL_ADDRESS="Street 1, 12345 City, Country"
//   LEGAL_EMAIL="hello@yourdomain.com"
//   LEGAL_COUNTRY="Germany"            (whose courts/law apply to the terms)
//
// Until they're filled in, the pages show clear [placeholders] so nothing goes live unnoticed.

const v = (key: string, fallback: string) => (process.env[key] || "").trim() || fallback;

export function legalInfo() {
  return {
    owner: v("LEGAL_OWNER", "[Your full name or company]"),
    address: v("LEGAL_ADDRESS", "[Street, postcode, city, country]"),
    email: v("LEGAL_EMAIL", "[contact email]"),
    country: v("LEGAL_COUNTRY", "[your country]"),
    updated: "7 October 2026",
  };
}

export const LEGAL_LINKS = [
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/copyright", label: "Copyright & takedown" },
  { href: "/legal/impressum", label: "Legal notice" },
  { href: "/contact", label: "Contact" },
  { href: "/cancel", label: "Cancel subscription" },
] as const;
