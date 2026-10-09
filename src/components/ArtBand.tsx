import type { ReactNode } from "react";

const COLOR: Record<string, string> = { W: "#efe6c0", U: "var(--mana-u)", B: "#3b2f47", R: "var(--mana-r)", G: "var(--mana-g)" };

// The top of a commander or deck page: the card's own art, blurred and darkened, behind the page's
// title, with a strip along the foot in just that card's colours (colourless cards get grey).
export default function ArtBand({ art, colors, children }: { art?: string | null; colors?: string[]; children: ReactNode }) {
  const order = ["W", "U", "B", "R", "G"].filter((c) => colors?.includes(c));
  const strip = order.length ? order : ["C"];
  return (
    <section className="relative overflow-hidden bg-[#141009]">
      {art && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-xl saturate-125" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#141009]/90 via-[#141009]/65 to-[#141009]/35" aria-hidden />
      <div className="relative">{children}</div>
      <div className="relative flex h-1" aria-hidden>
        {strip.map((c) => (
          <span key={c} className="flex-1" style={{ background: COLOR[c] ?? "#b7b8ba" }} />
        ))}
      </div>
    </section>
  );
}
