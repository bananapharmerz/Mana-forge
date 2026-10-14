import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deckLimitFor } from "@/lib/tier";
import DeckDoctorClient from "./DeckDoctorClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deck Doctor — instant Commander brews",
  description:
    "Name a commander and Deck Doctor builds a strong 100-card Commander deck from the cards the community plays most on EDHREC — with an optional budget. Then open it in the builder to tweak.",
  alternates: { canonical: "/deck-doctor" },
  openGraph: { images: ["/opengraph-image"], title: "Deck Doctor · Mana Forge", description: "Instant, data-driven Commander brews with an optional budget." },
};

export default async function DeckDoctorPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return <DeckDoctorClient guest deckLimit={null} deckCount={0} />;
  }

  const [user, deckCount] = await Promise.all([
    db.user.findUnique({ where: { id: session.user.id } }),
    db.deck.count({ where: { ownerId: session.user.id } }),
  ]);
  const limit = deckLimitFor(user?.tier ?? "free");

  return <DeckDoctorClient deckLimit={Number.isFinite(limit) ? limit : null} deckCount={deckCount} />;
}
