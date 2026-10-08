import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// What search engines may crawl. Personal pages (decks being edited, carts, checkouts, game
// rooms, accounts) stay out of search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/deck-builder", "/login", "/signup", "/store/cart", "/store/checkout", "/store/success", "/proxies/checkout", "/proxies/success", "/play/"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
