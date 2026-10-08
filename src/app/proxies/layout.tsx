import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MTG proxies for playtesting",
  description: "Order printed proxy cards for playtesting your Commander deck: pick any card and art, or send a whole decklist at once.",
  alternates: { canonical: "/proxies" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
