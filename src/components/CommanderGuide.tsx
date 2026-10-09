import Link from "next/link";
import { colorIdentityCategories } from "@/lib/categories";
import type { EdhrecCardView, EdhrecCommanderData } from "@/lib/edhrec";

// A short written guide for each commander, put together from play data: how popular it is,
// what decks do with it, what a typical list looks like, the cards played most, combos and
// similar commanders. Gives every commander page its own readable text (and search engines
// something to index beyond card images).

const WORD: Record<string, string> = { W: "white", U: "blue", B: "black", R: "red", G: "green" };

const ORDER = "WUBRG";

export function colorPhrase(identity: string[] | undefined): string {
  const ids = [...(identity ?? [])].filter((c) => ORDER.includes(c)).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  if (!ids.length) return "colorless";
  if (ids.length === 1) return `mono-${WORD[ids[0]]}`;
  if (ids.length === 5) return "five-color";
  const key = [...ids].sort().join("");
  const match = colorIdentityCategories.find((c) => [...(c.colors ?? [])].sort().join("") === key);
  const label = match?.label.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const words = ids.map((c) => WORD[c]);
  const list = words.length === 2 ? words.join(" and ") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
  if (ids.length === 4) return `four-color (${list})`;
  return label && !/color/i.test(label) ? `${label} (${list})` : list;
}

const article = (w: string) => (/^[aeiou]/i.test(w) ? "an" : "a");

const pct = (c: EdhrecCardView) => (c.potential_decks > 0 ? Math.round((c.num_decks / c.potential_decks) * 100) : 0);
const fmt = (n: number) => n.toLocaleString("en-US");
const listOf = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

export default function CommanderGuide({
  name,
  identity,
  typeLine,
  edhrec,
  mostPlayed,
  siteDecks,
}: {
  name: string;
  identity: string[] | undefined;
  typeLine: string | undefined;
  edhrec: EdhrecCommanderData;
  mostPlayed: EdhrecCardView[];
  siteDecks: number;
}) {
  const o = edhrec.overview;
  const t = edhrec.typeCounts;
  const top = [...mostPlayed].sort((a, b) => pct(b) - pct(a)).slice(0, 6);
  const short = name.split(",")[0].split(" // ")[0];
  const kind = (typeLine ?? "").split("—")[0].replace(/Legendary\s*/i, "").trim().toLowerCase() || "commander";

  const typical = [
    t.land ? `${t.land} lands${o.basics != null ? ` (${o.basics} basic)` : ""}` : null,
    t.creature ? `${t.creature} creatures` : null,
    t.instant ? `${t.instant} instants` : null,
    t.sorcery ? `${t.sorcery} sorceries` : null,
    t.artifact ? `${t.artifact} artifacts` : null,
    t.enchantment ? `${t.enchantment} enchantments` : null,
    t.planeswalker ? `${t.planeswalker} planeswalkers` : null,
  ].filter((x): x is string => !!x);

  return (
    <section aria-labelledby="guide" className="mt-10">
      <h2 id="guide" className="font-display text-3xl font-semibold text-foreground">
        {name} deck guide
      </h2>
      <div className="mt-3 max-w-3xl space-y-3 text-[15px] leading-relaxed text-foreground/90">
        <p>
          {name} is {article(colorPhrase(identity))} {colorPhrase(identity)} {kind} commander.
          {o.numDecks ? (
            <>
              {" "}
              It leads {fmt(o.numDecks)} decks on EDHREC
              {o.rank ? <>, where it ranks #{fmt(o.rank)} among all commanders</> : null}.
            </>
          ) : null}
          {siteDecks > 0 && (
            <>
              {" "}
              Players have shared {siteDecks} {short} deck{siteDecks === 1 ? "" : "s"} on Mana Forge.
            </>
          )}
        </p>
        {o.themes.length > 0 && (
          <p>
            Most {short} decks are built around {listOf(o.themes.slice(0, 3).map((x) => x.name.toLowerCase()))}
            {o.themes.length > 3 ? <>, with {listOf(o.themes.slice(3).map((x) => x.name.toLowerCase()))} builds close behind</> : null}.
          </p>
        )}
        {typical.length > 2 && <p>A typical {short} list runs {listOf(typical)}.</p>}
        {top.length > 0 && (
          <p>
            The cards played most with {short}:{" "}
            {top.map((c, i) => (
              <span key={c.name}>
                <b className="font-semibold">{c.name}</b> ({pct(c)}% of decks){i < top.length - 2 ? ", " : i === top.length - 2 ? " and " : "."}
              </span>
            ))}
          </p>
        )}
        {o.combos.length > 0 && (
          <div>
            <p>Well-known combos with {short}:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {o.combos.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        {o.similar.length > 0 && (
          <p>
            Similar commanders:{" "}
            {o.similar.map((s, i) => (
              <span key={s}>
                <Link href={`/decks/${encodeURIComponent(s)}`} className="text-gold-bright underline hover:text-gold">
                  {s}
                </Link>
                {i < o.similar.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        )}
        <p className="text-xs text-muted">
          Play data from{" "}
          <a href="https://edhrec.com" target="_blank" rel="noopener noreferrer" className="underline">
            EDHREC
          </a>
          , updated daily.
        </p>
      </div>
    </section>
  );
}
