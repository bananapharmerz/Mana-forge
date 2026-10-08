// A commander with a few of the deck's best cards tucked behind it. On hover (or keyboard
// focus) the cards fan out like a hand. Pure CSS, so it works in server components.

export default function CardFan({ commander, cards, alt }: { commander: string; cards: string[]; alt: string }) {
  const behind = cards.slice(0, 3);
  const spread = [-1, 1, -2].slice(0, behind.length);
  return (
    <div className="group/fan relative w-16 shrink-0" style={{ aspectRatio: "5 / 7" }}>
      {behind.map((src, i) => (
        <div
          key={src + i}
          aria-hidden
          className="fan-card absolute inset-0 overflow-hidden rounded shadow-md ring-1 ring-black/20"
          style={{ ["--fan" as string]: spread[i], zIndex: 1 + i }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      ))}
      <div className="fan-top absolute inset-0 z-10 overflow-hidden rounded shadow-lg ring-1 ring-black/25">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={commander} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      </div>
    </div>
  );
}
