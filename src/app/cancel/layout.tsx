import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancel subscription",
  description: "Cancel your Premium subscription.",
  alternates: { canonical: "/cancel" },
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
