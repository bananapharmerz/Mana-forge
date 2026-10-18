import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import PackOpener from "@/components/PackOpener";

export const metadata: Metadata = {
  title: "MTG Pack Opening Simulator — rip free booster packs",
  description:
    "A free MTG pack opening simulator — rip virtual booster packs from any set, with animated pulls, real card prices and your best hits. No cards required.",
  alternates: { canonical: "/packs" },
};

export default function PacksPage() {
  return (
    <>
      <PageHeader
        title="Open Packs"
        description="A free pack opening simulator — rip virtual boosters from any set, with animated pulls, real card prices and your best hits. No cards required."
        width="max-w-4xl"
      />
      <PackOpener />
    </>
  );
}
