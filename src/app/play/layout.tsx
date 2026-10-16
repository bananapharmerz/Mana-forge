import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Play Commander online free — virtual tabletop",
  description: "Play Magic: The Gathering Commander online with friends, free — a shared virtual tabletop with the battlefield, hands and life totals synced in real time. No download.",
  alternates: { canonical: "/play" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
