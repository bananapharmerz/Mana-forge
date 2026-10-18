import Link from "next/link";
import {
  colorIdentityCategories,
  typalCategories,
  themeCategories,
} from "@/lib/categories";

// A short written guide for each "best <category> commanders" landing page. Gives every category
// page its own readable, category-specific text — a definition, the standout commanders pulled
// live from the ranked list, and how to approach building — instead of a bare grid of card
// images. The standouts line is always true to the current data, so even categories without a
// hand-written intro still read as their own page rather than boilerplate.

type Kind = "color" | "tribe" | "theme";

function kindOf(slug: string): Kind {
  if (colorIdentityCategories.some((c) => c.slug === slug)) return "color";
  if (typalCategories.some((c) => c.slug === slug)) return "tribe";
  return "theme";
}

const listOf = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`;

// Hand-written definitions for the evergreen, high-traffic categories (every colour pair, plus
// the biggest tribes and themes). Accurate, flavour-true, and stable over time. Categories not
// listed here fall back to the structural description in `fallbackIntro`.
const INTRO: Record<string, string> = {
  // Colours
  "mono-w":
    "White in Commander is the colour of order: go-wide tokens, lifegain, anthems, and some of the game's best board-wide removal and protection. Mono-white decks lean on efficient creatures and powerful enchantments, with newer printings finally giving the colour real card advantage.",
  "mono-u":
    "Blue is the colour of card draw, counterspells, and control. Mono-blue commanders tend toward spellslinger, artifacts, tempo, and grindy value engines that bury the table in resources.",
  "mono-b":
    "Black trades life and resources for raw power — tutors, reanimation, drain, and relentless card advantage. Mono-black decks grind opponents down and keep recurring threats from the graveyard.",
  "mono-r":
    "Red is aggression, burn, haste, and chaos. Mono-red commanders go fast, sacrifice for value, dig with impulsive draw, or chain extra combat steps into an early kill.",
  "mono-g":
    "Green is ramp, huge creatures, and +1/+1 counters. Mono-green decks accelerate ahead on mana and simply out-size the rest of the table.",
  colorless:
    "Colourless commanders — mostly Eldrazi and artifact-matters legends — build around ramp, artifacts, and devastating top-end that a deck of any colours can support.",
  azorius:
    "Azorius pairs white's removal and protection with blue's counters and card draw — the classic control, flyers, and blink colours.",
  dimir:
    "Dimir blends blue's card advantage with black's removal and recursion: mill, control, theft, and graveyard value.",
  rakdos:
    "Rakdos is aggression and sacrifice — burn, aristocrats, and reanimator with a fast, punishing clock.",
  gruul:
    "Gruul is big, fast, and ramp-fuelled — beatdown, dragons, and haymakers that land ahead of schedule.",
  selesnya:
    "Selesnya goes wide and tall: tokens, +1/+1 counters, lifegain, and anthems backed by green ramp.",
  orzhov:
    "Orzhov grinds with lifegain, aristocrats, drain, and recursion — attrition that outlasts the table.",
  izzet:
    "Izzet is spellslinger and artifacts: instants and sorceries, copy effects, and combo-leaning value.",
  golgari:
    "Golgari is the graveyard colour pair — reanimator, sacrifice, +1/+1 counters, and value that keeps coming back.",
  boros:
    "Boros is aggressive and equipment-driven: go-wide tokens, voltron, and efficient combat.",
  simic:
    "Simic is ramp and card advantage — +1/+1 counters, big mana, clones, and value engines.",
  jeskai:
    "Jeskai combines control, spellslinger, and artifacts with an aggressive or combo finish.",
  sultai:
    "Sultai is the graveyard-and-value wedge: ramp, reanimation, card draw, and grindy control.",
  mardu:
    "Mardu is aggression and aristocrats — tokens, sacrifice, and powerful removal across three colours.",
  temur:
    "Temur is big mana and spells: ramp, giant threats, and spellslinger payoffs.",
  abzan:
    "Abzan is midrange value — +1/+1 counters, lifegain, graveyard recursion, and resilient threats.",
  "four-plus":
    "Four- and five-colour commanders open the whole card pool: goodstuff piles, superfriends, and value engines hungry for mana fixing.",
  // Tribes
  dragons:
    "Dragons are big, powerful, usually expensive fliers. Dragon decks lean on ramp to cast them early and payoffs that reward having a board full of them.",
  elves:
    "Elves are Commander's premier mana tribe — cheap creatures that tap for mana and snowball into explosive, go-wide turns.",
  zombies:
    "Zombies grind the game out: cheap, recursive creatures, token swarms, and graveyard value that refuses to stay dead.",
  vampires:
    "Vampires mix aggression with lifegain and aristocrats — attacking tribes backed by drain and sacrifice value.",
  goblins:
    "Goblins are fast and explosive — cheap creatures, token swarms, and sacrifice payoffs that end games out of nowhere.",
  humans:
    "Humans are the broadest tribe in the game, spanning every colour, so Human decks can go aggressive, wide, or value-driven.",
  angels:
    "Angels are high-impact white fliers — lifegain, protection, and powerful top-end that stabilises and then takes over.",
  // Themes
  tokens:
    "Token decks flood the board with creatures, then convert that width into damage, sacrifice value, or anthems that make the whole team lethal.",
  counters:
    "+1/+1 counter decks grow a board of creatures permanently bigger, with proliferate and doublers turning a small start into an overwhelming one.",
  artifacts:
    "Artifact decks lean on cheap, recurring, and synergistic artifacts — cost reduction, ramp, and payoffs that scale with how many you control.",
  lifegain:
    "Lifegain decks turn gaining life into a resource: card draw, drain, and payoffs that reward crossing life-total thresholds.",
  spellslinger:
    "Spellslinger decks win with instants and sorceries — magecraft, copy effects, and payoffs that trigger every time you cast.",
  reanimator:
    "Reanimator decks cheat huge threats out of the graveyard, filling it on purpose and returning game-ending creatures for a fraction of their cost.",
  aristocrats:
    "Aristocrats decks sacrifice their own creatures for value — drain, card draw, and recursion that grinds the whole table down.",
  voltron:
    "Voltron decks load a single creature with auras and equipment, then win through commander damage before the table can answer it.",
  mill:
    "Mill decks attack libraries instead of life totals, emptying opponents' decks while protecting themselves until the cards run out.",
  ramp:
    "Ramp decks accelerate their mana ahead of the curve, powering out expensive threats and game-warping spells early.",
};

function fallbackIntro(kind: Kind, label: string): string {
  if (kind === "tribe") {
    return `${label} are a popular creature type to build around in Commander. A ${label} deck wants a commander that rewards filling the board with more of them — through anthems, cost reduction, or effects that scale with how many you control — then fills out with the best ${label} and the staples that protect them.`;
  }
  if (kind === "theme") {
    return `${label} is a popular strategy in Commander. These commanders turn the ${label.toLowerCase()} plan into a win condition, backed by the enablers and payoffs that make it consistent.`;
  }
  return `These are the most-built commanders in this colour identity, ranked by how often players build them.`;
}

const BUILD_TIP: Record<Kind, string> = {
  color:
    "Pick the commander whose plan matches how you like to win — the cards below are the ones its decks run most.",
  tribe:
    "Start from a commander that pays off your creatures sharing the type, then add the strongest members of the tribe and the protection to keep them around.",
  theme:
    "Look for a commander that turns the strategy into a win condition, plus the enablers that make it fire every game.",
};

export default function CategoryGuide({
  slug,
  label,
  topCommanders,
}: {
  slug: string;
  label: string;
  topCommanders: string[];
}) {
  const kind = kindOf(slug);
  const short = label.split(" (")[0];
  const intro = INTRO[slug] ?? fallbackIntro(kind, short);
  const tops = topCommanders.slice(0, 3);

  return (
    <section aria-labelledby="cat-guide" className="mt-6 max-w-3xl space-y-3 text-[15px] leading-relaxed text-foreground/90">
      <h2 id="cat-guide" className="sr-only">
        About {short} commanders
      </h2>
      <p>{intro}</p>
      {tops.length > 0 && (
        <p>
          The most-built {short} commanders right now are{" "}
          {tops.map((name, i) => (
            <span key={name}>
              <Link
                href={`/decks/${encodeURIComponent(name)}`}
                className="font-semibold text-gold-bright underline hover:text-gold"
              >
                {name}
              </Link>
              {i < tops.length - 2 ? ", " : i === tops.length - 2 ? " and " : "."}
            </span>
          ))}{" "}
          Open any one for its full deck guide — top cards, a sample list, mana curve and live
          prices.
        </p>
      )}
      <p>
        {BUILD_TIP[kind]} When you&apos;re ready, start building for free in the{" "}
        <Link href="/deck-builder" className="underline hover:text-gold-bright">
          deck builder
        </Link>
        .
      </p>
    </section>
  );
}
