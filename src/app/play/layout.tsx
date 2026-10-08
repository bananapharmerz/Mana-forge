import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Play Commander online with friends",
  description: "Open a table and play Magic: The Gathering Commander online with friends: shared battlefield, hands and life totals, synced in real time.",
  alternates: { canonical: "/play" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
