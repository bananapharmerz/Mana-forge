import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import PackOpener from "@/components/PackOpener";

export const metadata: Metadata = {
  title: "Open Packs — free MTG booster simulator",
  description:
    "Rip virtual Magic: The Gathering booster packs from any set. Animated pulls, real card prices, and your best hits — free, no cards required.",
  alternates: { canonical: "/packs" },
};

export default function PacksPage() {
  return (
    <>
      <PageHeader
        title="Open Packs"
        description="Rip virtual boosters from any set — animated pulls, real card prices, your best hits. Free, and no cards required."
        width="max-w-4xl"
      />
      <PackOpener />
    </>
  );
}
