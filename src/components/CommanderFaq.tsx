import { colorPhrase } from "./CommanderGuide";
import type { EdhrecCardView, EdhrecCommanderData } from "@/lib/edhrec";

// A short, data-driven FAQ for each commander page. Every answer is built from this commander's
// own play data (colour identity, EDHREC rank and deck count, top cards, themes, combos), so each
// page's FAQ is specific rather than boilerplate. It also emits FAQPage structured data so the
// questions are eligible for Google's rich results — the main SEO reason it exists.

const fmt = (n: number) => n.toLocaleString("en-US");
const listOf = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
const pct = (c: EdhrecCardView) => (c.potential_decks > 0 ? Math.round((c.num_decks / c.potential_decks) * 100) : 0);

export default function CommanderFaq({
  name,
  identity,
  edhrec,
  mostPlayed,
}: {
  name: string;
  identity: string[] | undefined;
  edhrec: EdhrecCommanderData;
  mostPlayed: EdhrecCardView[];
}) {
  const short = name.split(",")[0].split(" // ")[0];
  const o = edhrec.overview;
  const colour = colorPhrase(identity);
  const top = [...mostPlayed].sort((a, b) => pct(b) - pct(a)).slice(0, 5).map((c) => c.name);

  const qa: { q: string; a: string }[] = [];

  qa.push({
    q: `What colors is ${short}?`,
    a: `${name} is ${/^[aeiou]/i.test(colour) ? "an" : "a"} ${colour} commander, so ${/^[aeiou]/i.test(short) ? "an" : "a"} ${short} deck can run cards within that color identity.`,
  });

  if (o.numDecks) {
    qa.push({
      q: `Is ${short} a good commander?`,
      a: `${short} is one of the more popular commanders to build — it leads ${fmt(o.numDecks)} decks on EDHREC${
        o.rank ? `, ranking #${fmt(o.rank)} among all commanders` : ""
      }. Popularity isn't the same as raw power, but it means there are plenty of proven lists and support cards to build from.`,
    });
  }

  if (o.themes && o.themes.length > 0) {
    qa.push({
      q: `What decks can you build with ${short}?`,
      a: `The most common ${short} strategies are ${listOf(o.themes.slice(0, 3).map((t) => t.name.toLowerCase()))}. Pick the plan you enjoy and build the deck around it.`,
    });
  }

  if (top.length > 0) {
    qa.push({
      q: `What are the best cards to play with ${short}?`,
      a: `The cards ${short} decks run most often are ${listOf(top)}. They show up across most builds, so they're a safe place to start.`,
    });
  }

  if (o.combos && o.combos.length > 0) {
    qa.push({
      q: `Are there any combos with ${short}?`,
      a: `Yes — well-known lines include ${listOf(o.combos.slice(0, 3))}.`,
    });
  }

  if (o.similar && o.similar.length > 0) {
    qa.push({
      q: `What commanders are similar to ${short}?`,
      a: `If you like ${short}, also look at ${listOf(o.similar.slice(0, 4))}.`,
    });
  }

  if (qa.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((x) => ({
      "@type": "Question",
      name: x.q,
      acceptedAnswer: { "@type": "Answer", text: x.a },
    })),
  };

  return (
    <section aria-labelledby="faq" className="mt-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <h2 id="faq" className="mb-4 text-xl font-bold text-foreground">
        {short} — frequently asked questions
      </h2>
      <div className="max-w-3xl space-y-4">
        {qa.map((x) => (
          <div key={x.q}>
            <h3 className="text-[15px] font-semibold text-foreground">{x.q}</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-foreground/90">{x.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
