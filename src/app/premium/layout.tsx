import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Premium",
  description: `${SITE.name} Premium: unlimited saved decks, no ads, and instant game starts.`,
  alternates: { canonical: "/premium" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
