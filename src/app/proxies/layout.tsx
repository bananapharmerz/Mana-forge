import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free MTG proxy printer for playtesting",
  description: "Make free print-at-home proxy sheets for playtesting: pick any card and printing, download a real-size PDF with cut marks (A4 or Letter).",
  alternates: { canonical: "/proxies" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
