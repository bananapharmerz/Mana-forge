import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { addDays, isWeekEnd, lastWeekEnd, moversForWeek } from "@/lib/prices";
import MoversView, { weekLabel } from "../MoversView";

// A finished week never changes, so it can be cached for a long time.
export const revalidate = 86400;

function valid(week: string): boolean {
  if (!isWeekEnd(week)) return false;
  const last = lastWeekEnd();
  return week <= last && week >= addDays(last, -371);
}

export async function generateMetadata({ params }: { params: Promise<{ week: string }> }): Promise<Metadata> {
  const { week } = await params;
  if (!valid(week)) return { title: "Week not found", robots: { index: false } };
  const label = weekLabel({ startDay: addDays(week, -7), endDay: week });
  const title = `Commander price movers: ${label}`;
  const description = `The Magic: The Gathering cards in Commander decks whose prices rose and fell most in the week ${label}.`;
  return { title, description, alternates: { canonical: `/prices/movers/${week}` }, openGraph: { title, description, url: `/prices/movers/${week}` } };
}

export default async function MoversWeekPage({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  if (!valid(week)) notFound();
  const w = await moversForWeek(week);
  const last = lastWeekEnd();
  const archive = Array.from({ length: 12 }, (_, i) => addDays(last, -7 * i));
  return (
    <>
      <PageHeader title={`Price movers: ${weekLabel(w)}`} description="Cards in Commander decks that gained or lost the most that week." width="max-w-6xl" />
      <MoversView w={w} archive={archive} current={week} />
    </>
  );
}
