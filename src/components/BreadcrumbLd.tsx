import { SITE } from "@/lib/site";

// Breadcrumb structured data for Google: shows "Mana Forge › Card prices › Sol Ring" under the
// result instead of a bare URL. Pass the trail after Home as [name, path] pairs.
export default function BreadcrumbLd({ trail }: { trail: [name: string, path: string][] }) {
  const items = [["Home", "/"], ...trail].map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${SITE.url}${path === "/" ? "" : path}` }));
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items }).replace(/</g, "\\u003c") }}
    />
  );
}
