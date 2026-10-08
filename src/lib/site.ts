// The site's name, address and how it describes itself, in one place. Every page title, share
// preview, the sitemap, the logo text and the intro read from here, so renaming the site
// (if the name or domain isn't available) is two lines in .env and a restart:
//
//   NEXT_PUBLIC_SITE_NAME="Mana Forge"
//   NEXT_PUBLIC_SITE_URL="https://manaforgehub.com"
//   NEXT_PUBLIC_SITE_TAGLINE="Magic: The Gathering decks, tools & gear"   (optional)
//
// NEXT_PUBLIC_ values are read when the server starts, by both the server and the browser.

const name = (process.env.NEXT_PUBLIC_SITE_NAME || "Mana Forge").trim();
const url = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").trim().replace(/\/+$/, "");

export const SITE = {
  name,
  upper: name.toUpperCase(),
  // Initials for small marks on the 3D cards ("Mana Forge" -> "MF").
  initials: name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3),
  url,
  tagline: (process.env.NEXT_PUBLIC_SITE_TAGLINE || "Magic: The Gathering decks, tools & gear").trim(),
  description:
    "Everything Magic: The Gathering in one place: build and share decks, browse commanders, play online with friends, track card prices, order proxies and shop sleeves, deck boxes and playmats.",
  keywords: [
    "Magic: The Gathering",
    "MTG",
    "MTG deck builder",
    "MTG decks",
    "Commander",
    "EDH",
    "MTG proxies",
    "card prices",
    "play MTG online",
  ],
  twitter: process.env.NEXT_PUBLIC_SITE_TWITTER || undefined, // e.g. "@manaforge"
  // Shown in Google and share previews; the dark theme colour of the hero and story sections.
  themeColor: "#07050c",
  accent: "#e0b252",
} as const;

export const absoluteUrl = (path = "/") => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
