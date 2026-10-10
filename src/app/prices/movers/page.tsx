import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import { addDays, lastWeekEnd, moversForWeek, yesterday } from "@/lib/prices";
import MoversView, { weekLabel } from "./MoversView";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Commander price movers this week",
  description: "The Magic: The Gathering cards in Commander decks whose prices rose and fell most over the last 7 days, with 30-day price lines.",
  alternates: { canonical: "/prices/movers" },
  openGraph: { title: "Commander price movers this week · Mana Forge", description: "The Commander cards whose prices rose and fell most over the last 7 days." },
};

export default async function MoversPage() {
  const end = yesterday(); // the last full day of prices
  const w = await moversForWeek(end);
  const last = lastWeekEnd();
  const archive = Array.from({ length: 12 }, (_, i) => addDays(last, -7 * i));
  return (
    <>
      <PageHeader title="Commander price movers" description={`The last 7 days (${weekLabel(w)}): cards in Commander decks that gained or lost the most.`} width="max-w-6xl" />
      <MoversView w={w} archive={archive} />
    </>
  );
}
