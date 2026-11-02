import type { ReactNode } from "react";
import type { EdhrecCommanderData, EdhrecPublicDeck } from "@/lib/edhrec";

// "Commander at a glance": the same short spec sheet on every commander page, so two commanders
// can be compared at a glance. Same labels, same order, a unit on every number. A row with no
// reliable value is left out rather than filled with a guess. Uses only data the page already
// loads (no extra requests). Sits in the dark art band at the top, hence the fixed colours.

const COLOUR_NAMES: Record<string, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" };
const ORDER = ["W", "U", "B", "R", "G"];
const fmt = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, one: string, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function Info({ text }: { text: string }) {
  return (
    <span title={text} aria-label={text} className="ml-1 cursor-help text-[10px] text-[#a99c7c]">
      (i)
    </span>
  );
}

const Edhrec = () => (
  <a href="https://edhrec.com" target="_blank" rel="noopener noreferrer" className="ml-1 text-[10px] text-[#a99c7c] underline hover:text-[#f5ecd6]">
    EDHREC
  </a>
);

export default function CommanderAtAGlance({
  identity,
  siteDecks,
  siteName,
  edhrec,
  edhrecDecks,
}: {
  identity: string[];
  siteDecks: number;
  siteName: string;
  edhrec: EdhrecCommanderData | null;
  edhrecDecks: EdhrecPublicDeck[] | null;
}) {
  const o = edhrec?.overview;
  const colours = identity.length
    ? [...identity].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).map((c) => COLOUR_NAMES[c] ?? c).join(", ")
    : "Colourless";
  // A sample of real EDHREC decks: only worth calling "typical" with a handful of prices.
  const prices = (edhrecDecks ?? []).map((d) => d.priceUsd).filter((p) => typeof p === "number" && p > 0);
  const price = prices.length >= 5 ? median(prices) : null;
  const combos = o?.allCombos.length ?? 0;

  const rows: { label: ReactNode; value: ReactNode }[] = [
    { label: "Colours", value: colours },
    { label: `Decks on ${siteName}`, value: plural(siteDecks, "deck") },
  ];
  if (o?.numDecks) rows.push({ label: "Decks on EDHREC", value: <>{plural(o.numDecks, "deck")}<Edhrec /></> });
  if (o?.rank)
    rows.push({
      label: <>EDHREC rank<Info text="Where this commander ranks among all commanders on EDHREC, by number of decks. #1 is the most built." /></>,
      value: <>#{fmt(o.rank)} of all commanders<Edhrec /></>,
    });
  if (o && o.themes.length > 0) rows.push({ label: "Top themes", value: <>{o.themes.slice(0, 3).map((t) => t.name).join(", ")}<Edhrec /></> });
  if (o && combos > 0)
    rows.push({
      label: <>Known combos<Info text="Combos EDHREC lists for this commander. A deck only has them if it runs every piece." /></>,
      value: <>{combos >= 40 ? "40+ combos" : plural(combos, "combo")}<Edhrec /></>,
    });
  if (price !== null)
    rows.push({
      label: <>Typical deck price<Info text={`Estimate: the median price of ${prices.length} public decks on EDHREC, in US dollars. Your build can cost much more or less.`} /></>,
      value: <>about ${fmt(Math.round(price))} (USD, estimate)<Edhrec /></>,
    });

  return (
    <section aria-label="Commander at a glance" className="mt-6 max-w-md rounded-lg border border-[#e0b252]/40 bg-black/30 px-4 py-3">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#e0b252]">Commander at a glance</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map((r, i) => (
          <div key={i} className="contents">
            <dt className="text-[#cdbf9e]">{r.label}</dt>
            <dd className="text-right text-[#f5ecd6]">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
