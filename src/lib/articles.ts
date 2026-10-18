// Original editorial articles for /articles — Mana Forge's own writing (not aggregated card data).
// Each body is a small Markdown subset rendered by src/components/ArticleBody.tsx: blank-line
// separated blocks, "## " / "### " headings, "- " bullet lists, and inline **bold** and [text](url).
// Keep these genuinely useful and evergreen; add new ones at the top (newest first).

export type Article = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO date, publication day
  updated?: string; // ISO date, if revised
  readMins: number;
  category: string;
  body: string;
};

export const ARTICLES: Article[] = [
  {
    slug: "how-much-does-a-commander-deck-cost",
    title: "How much does a Commander deck really cost?",
    description:
      "A plain-English breakdown of what a Commander (EDH) deck actually costs to build — from a $30 starting point to a tuned $500 list — and where the money really goes.",
    date: "2026-10-18",
    readMins: 6,
    category: "Budget",
    body: `New players hear two very different numbers. A friend says they built a deck for $40; a stranger online shows off one worth $2,000. Both are telling the truth, because "a Commander deck" isn't one price — it's a range, and most of the cost is concentrated in a handful of cards.

Here's how to think about it.

## The four price tiers

- **Precon / ultra-budget — about $0 to $50.** A preconstructed deck off the shelf plays out of the box. Build one yourself from cheap commons and uncommons and you can land under $30. Every card does a job; nothing is flashy.
- **Budget — about $50 to $150.** This is where most kitchen-table decks live. You can run a focused strategy, a sensible mana base, and a few real payoff cards.
- **Mid / "focused" — about $150 to $500.** Now you're paying for consistency: better lands, a cleaner curve, and the three or four cards that make the deck actually win.
- **High-end — $500 and up.** Fast mana, original dual lands, and premium staples. The jump from $500 to $2,000 buys speed and polish, not a new strategy.

The useful insight: **going from $40 to $150 changes how a deck plays. Going from $500 to $2,000 mostly changes how fast.**

## Where the money actually goes

Open up almost any expensive list and price it card by card, and you'll find the cost isn't spread evenly. It clusters:

- **The mana base.** Original dual lands, fetch lands and fast mana are the single biggest line item in most tuned decks — often more than the rest of the deck combined. This is also the easiest place to save: budget lands that enter tapped cost pennies and lose you almost nothing at a casual table.
- **A few "staple" cards.** Every format has cards that show up in a huge share of decks because they're simply efficient. Those get bid up precisely because everyone wants them.
- **One or two chase cards.** The deck's signature combo piece or bomb.

Everything else — the bulk of the 99 — is usually cheap. That's the good news: **you can build 90% of a deck for very little and spend selectively on the pieces that matter.**

## How to build well on a budget

1. **Pick a commander, not a price.** Start from a strategy you'll enjoy piloting. A well-built $60 deck beats a scattered $400 one.
2. **Fix the mana base first.** Consistent mana makes a cheap deck feel expensive. Tapped dual lands are the best value in the game.
3. **Spend on your payoffs, save on the glue.** Put your money into the two or three cards the deck is built around. Fill the rest with efficient, cheap role-players.
4. **Price the deck as you build.** Watching the running total as you add cards stops the slow creep where a "budget" deck quietly becomes a $300 one. (Mana Forge totals your deck live as you build, and tracks each card's price over time, so you see a spike before it costs you.)

## The honest answer

A good, fun, focused Commander deck costs **roughly $50 to $150** to build yourself, and you can go lower without the games getting worse. The expensive versions are buying marginal speed and consistency — real, but optional, and mostly relevant at higher-powered tables.

Build the deck you want to play first. Upgrade the pieces that actually come up. That's how you spend the least and enjoy it the most.`,
  },
  {
    slug: "reading-edhrec-without-netdecking",
    title: "How to read community deck data without just netdecking",
    description:
      "Community data tells you what the format plays with a commander. Here's how to read those percentages to build a deck that's yours — not a copy of everyone else's.",
    date: "2026-10-12",
    readMins: 5,
    category: "Deckbuilding",
    body: `Open any popular commander and you'll see the same thing: a ranked list of the cards people run with it, each with a percentage. It's the most useful starting point in Commander — and the easiest to misuse.

Copying the top 99 cards gives you a deck that works and that you had no part in building. Here's how to use the same data to build something that's actually yours.

## What the percentages mean

A card's "percent of decks" number is **popularity, not correctness.** It tells you how often players include a card with this commander — which bundles together three different things:

- Cards that are genuinely great with this commander (high and deserved).
- Cards that are great in *every* deck of this color, commander or not (the format staples).
- Cards that are popular because they're popular — everyone copies the same list.

The skill is telling those apart.

## Read it in three passes

**Pass 1 — the synergy cards.** Good data tools separate "played a lot" from "played a lot *specifically here*." The cards that spike with this commander but are rare elsewhere are the ones that tell you what the deck *wants* to do. Start your list here. This is the deck's identity.

**Pass 2 — the staples.** Below the synergy picks you'll find the cards that show up with almost every commander in these colors: the efficient removal, the card draw, the ramp. You want most of these, but they're interchangeable. Pick the ones you own or like; swap freely.

**Pass 3 — the gaps.** Now look at what's *missing*. The list is an average of what people built, which means it inherits everyone's blind spots. If you spot a card that's perfect for your plan but sits at 4%, that's not a mistake to avoid — that's your edge.

## Make it yours

- **Cut 10 cards you don't care about and add 10 you do.** A deck you understand plays better than a deck you downloaded, because you know what every card is for.
- **Build around a line you enjoy,** not the one with the highest win rate. You'll play it more, and play it better.
- **Use the data to answer questions, not to make decisions.** "What do people run for card draw here?" is a great use. "What are the correct 99 cards?" is the wrong question — there isn't one.

## Why this matters

Netdecking is fine for a first draft and boring as a destination. The whole appeal of Commander is that your deck is a thing you made. Community data is the best research tool in the format precisely because it frees you from guessing on the boring 60% — so you can spend your attention on the 40% that makes the deck feel like yours.

Use it like a scouting report, not a recipe.`,
  },
  {
    slug: "commander-power-levels",
    title: "Commander power levels: how to actually have better games",
    description:
      "Why Commander games go sideways, what \"power level\" really means, and a simple way to match decks so every table has fun — without memorizing a number system.",
    date: "2026-10-05",
    readMins: 6,
    category: "Strategy",
    body: `Most bad Commander games aren't caused by a bad deck. They're caused by a mismatch — one deck built to win on turn five sat down with three decks built to goof around until turn twelve. Everyone did their job; the table just didn't agree on what game they were playing.

"Power level" is the shorthand for fixing that. It gets talked about like a precise number, but you don't need a rating system to get it right. You need to describe your deck honestly.

## What power level actually measures

Three things, mostly:

- **Speed.** How early can the deck realistically win or take over? Turn four is a different world from turn ten.
- **Consistency.** Does it do its thing almost every game, or does it need the right draw?
- **Interaction.** Can it stop other people, or does it only race?

A deck that's fast, consistent, and interactive is "high-powered" regardless of how much it cost. A pile of fun cards with no plan is "casual" even if every card is expensive. **Power level is about what the deck does, not what it's worth.**

## The one conversation that fixes 90% of games

Before you shuffle, each player says two or three sentences about their deck. Not a number — a description:

- "This one's a slow tokens deck, it tries to go wide around turn eight."
- "Mine's a focused combo deck, it can win around turn five if nobody stops it."
- "This is a pile of dragons, no real combo, just big creatures."

Thirty seconds of this and everyone knows what table they're at. The combo player can choose to leave that deck in the bag. The casual players know to keep an eye out. Nobody feels ambushed.

## How to tell where your own deck sits

Be honest about the uncomfortable questions:

- **What's your fastest realistic win, and how often does it happen?** If the answer is "turn five, pretty often," you're not a casual deck, whatever you'd like to believe.
- **How many ways do you have to interact with other players?** Lots of removal and counters pushes you up a tier.
- **Does the deck have a two-card "I win" combo?** That's a big step up in power, even if the rest is durdly.

## Brackets and rating systems

You'll see numbered scales and official "brackets" that try to formalize all this. They're useful as a common vocabulary — it's easier to say "bracket 2" than to re-explain your whole deck every pod. But they're a summary of the conversation above, not a replacement for it. A number gets you in the right ballpark; the two-sentence description gets you a good game.

## The real goal

Nobody remembers the game they won by stomping three people who never got to play. They remember the close ones. Matching power levels isn't about fairness for its own sake — it's the cheapest way to make sure everyone at the table actually gets to do the thing they built their deck to do.

Describe your deck honestly, listen to the others, and adjust. That one habit will do more for your games than any card you could buy.`,
  },
];

export const getArticle = (slug: string): Article | undefined => ARTICLES.find((a) => a.slug === slug);
export const ARTICLE_SLUGS = ARTICLES.map((a) => a.slug);
