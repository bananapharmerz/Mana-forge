import Link from "next/link";
import CommanderSpotlight from "@/components/CommanderSpotlight";
import ForgeHero from "@/components/forge3d/ForgeHero";
import ForgeStory from "@/components/forge3d/ForgeStory";
import ForgeTrails from "@/components/forge3d/ForgeTrails";
import Reveal from "@/components/fx/Reveal";
import { db } from "@/lib/db";
import { SHOP_ENABLED } from "@/lib/features";
import { auth } from "@/auth";
import WelcomeBack from "@/components/WelcomeBack";
import StarterDecks from "@/components/StarterDecks";
import MobileStartBar from "@/components/MobileStartBar";
import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// Personal for signed-in players (welcome back, starter decks), so it renders per visit.

const features = [
  {
    href: "/commanders",
    title: "Commanders",
    desc: "Browse every legal commander by color identity, tribe, and archetype.",
    status: "live",
  },
  {
    href: "/decks",
    title: "Decks",
    desc: "See decks other players have built around any commander.",
    status: "live",
  },
  {
    href: "/deck-builder",
    title: "Deck Builder",
    desc: "Build and save your own 100-card singleton deck.",
    status: "live",
  },
  {
    href: "/prices",
    title: "Card Prices",
    desc: "Daily prices with week, month and year graphs, and a watchlist for the cards you want.",
    status: "live",
  },
  {
    href: "/play",
    title: "Play with Friends",
    desc: "A virtual tabletop to play Commander online in real time.",
    status: "live",
  },
  {
    href: "/proxies",
    title: "Proxies",
    desc: "Design and order custom proxy cards, or print your own.",
    status: SHOP_ENABLED ? "live" : "soon",
  },
  {
    href: "/store",
    title: "Store",
    desc: "Sleeves, playmats, deck boxes, dice, and more.",
    status: SHOP_ENABLED ? "live" : "soon",
  },
];

export default async function Home() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const [decks, members, mine] = await Promise.all([
    db.deck.count({ where: { isPublic: true } }).catch(() => 0),
    db.user.count().catch(() => 0),
    userId ? db.deck.count({ where: { ownerId: userId } }).catch(() => 0) : Promise.resolve(0),
  ]);
  const stats = [
    // Counts appear only once they're big enough to reassure; a tiny number puts people off.
    ...(decks >= 100 ? [{ label: "Public decks", value: decks.toLocaleString() }] : []),
    ...(members >= 250 ? [{ label: "Players", value: members.toLocaleString() }] : []),
  ];

  return (
    <>
      {userId && mine > 0 && <WelcomeBack userId={userId} name={session?.user?.name} />}
      <ForgeHero stats={stats} />
      <MobileStartBar />
      {(!userId || mine === 0) && <StarterDecks signedIn={!!userId} title={userId ? "Your first deck is one click away" : undefined} />}
      <CommanderSpotlight />
      <ForgeStory />
      <ForgeTrails />
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        <h2 className="mb-6 font-display text-3xl font-semibold text-foreground">Everything in the forge</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Things that aren't open yet (the store and proxies) stay off the home page. */}
          {features.filter((f) => f.status !== "soon").map((f, i) => (
            <Reveal key={f.href} delay={i * 70} className="flex">
            <Link
              href={f.href}
              className="card-frame group relative flex w-full flex-col gap-2 p-5 transition-all hover:-translate-y-0.5 hover:border-gold hover:shadow-[0_12px_30px_-18px_rgba(124,88,20,0.6)]"
            >
              {f.status === "soon" && (
                <span className="absolute right-4 top-4 rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                  Coming soon
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">
                {f.title} <span className="inline-block text-gold transition-transform group-hover:translate-x-1">→</span>
              </h3>
              <p className="text-sm text-muted">{f.desc}</p>
            </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </>
  );
}
