import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { rowToDeck } from "@/lib/deckSerialize";
import { deckSize, manaCurve } from "@/lib/deckTypes";
import { livePrices } from "@/lib/prices";
import { deckValue } from "@/lib/livePrice";
import { authorName } from "@/lib/author";
import { hit, ipFrom } from "@/lib/rateLimit";
import { SITE } from "@/lib/site";

// A shareable picture of a public deck (1200×630): commander art, deck name, author, card count,
// value, colours and mana curve. Used as the deck page's link preview and by the Share button.
//   /api/deck-card/<deckId>

const MANA: Record<string, string> = { W: "#f4ecd2", U: "#3d8fd6", B: "#6b5a8a", R: "#e0533a", G: "#3c9a5a", C: "#b8b0a0" };

// Scryfall's CDN can turn away server-side requests, so the art is optional: fetched with a short
// timeout and inlined; without it the card still renders on its own background.
async function artData(url: string | undefined): Promise<string | null> {
  if (!url?.startsWith("https://cards.scryfall.io/")) return null;
  const crop = url.replace("/normal/", "/art_crop/").replace("/large/", "/art_crop/");
  try {
    const res = await fetch(crop, { headers: { "User-Agent": "mtg-hub/1.0", Accept: "image/*" }, signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!/^image\/(jpeg|png|webp)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 2_000_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ deckId: string }> }) {
  if (!hit(`deck-card:${ipFrom(req.headers)}`, 60, 60 * 1000)) return new Response("Slow down", { status: 429 });
  const { deckId } = await params;
  const row = await db.deck.findUnique({ where: { id: String(deckId).slice(0, 40) }, include: { owner: { select: { name: true } } } });
  if (!row || !row.isPublic) return new Response("Not found", { status: 404 });

  const deck = rowToDeck(row);
  const size = deckSize(deck);
  const curve = manaCurve(deck);
  const maxCurve = Math.max(1, ...curve.map((c) => c.count));
  const ids = [deck.commander, deck.partner, deck.companion, ...deck.cards].filter((c): c is NonNullable<typeof c> => !!c?.scryfallId).map((c) => c.scryfallId);
  const value = deckValue(deck, await livePrices(ids).catch(() => ({}))).totalUsd;
  const colors = deck.commander?.colorIdentity?.length ? [...new Set([...(deck.commander.colorIdentity ?? []), ...(deck.partner?.colorIdentity ?? [])])] : ["C"];
  const art = await artData(deck.commander?.imageUrl);
  const commanders = [deck.commander?.name, deck.partner?.name].filter(Boolean).join(" & ") || row.commanderName;
  const title = deck.name.length > 48 ? `${deck.name.slice(0, 46)}…` : deck.name;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#141009", color: "#f5ecd6", fontFamily: "sans-serif" }}>
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art} alt="" width={1200} height={630} style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, objectFit: "cover" }} />
        ) : (
          <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, display: "flex", background: "linear-gradient(160deg, #1d1530 0%, #141009 55%, #24160a 100%)" }} />
        )}
        <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, display: "flex", background: "linear-gradient(90deg, rgba(20,16,9,0.96) 0%, rgba(20,16,9,0.86) 52%, rgba(20,16,9,0.35) 100%)" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "56px 64px" }}>
          <div style={{ display: "flex", gap: 10 }}>
            {colors.map((c) => (
              <div key={c} style={{ width: 30, height: 30, borderRadius: 15, background: MANA[c] ?? MANA.C, border: "2px solid rgba(255,255,255,0.35)", display: "flex" }} />
            ))}
          </div>
          <div style={{ marginTop: 26, fontSize: 26, letterSpacing: 4, color: "#e0b252", textTransform: "uppercase", fontWeight: 700, display: "flex" }}>Commander deck</div>
          <div style={{ marginTop: 10, fontSize: title.length > 30 ? 60 : 72, lineHeight: 1.05, fontWeight: 800, maxWidth: 760, display: "flex", fontFamily: "serif" }}>{title}</div>
          <div style={{ marginTop: 14, fontSize: 30, color: "#e9dfc6", maxWidth: 760, display: "flex" }}>{commanders}</div>
          <div style={{ marginTop: 6, fontSize: 24, color: "#cdbf9e", display: "flex" }}>by {authorName(row.owner.name)}</div>

          <div style={{ marginTop: "auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", border: "2px solid rgba(224,178,82,0.7)", borderRadius: 18, padding: "14px 22px", background: "rgba(224,178,82,0.10)" }}>
                <div style={{ fontSize: 20, color: "#cdbf9e", display: "flex" }}>Cards</div>
                <div style={{ fontSize: 40, fontWeight: 800, display: "flex" }}>{size}/100</div>
              </div>
              {value > 0 && (
                <div style={{ display: "flex", flexDirection: "column", border: "2px solid rgba(224,178,82,0.7)", borderRadius: 18, padding: "14px 22px", background: "rgba(224,178,82,0.10)" }}>
                  <div style={{ fontSize: 20, color: "#cdbf9e", display: "flex" }}>Value</div>
                  <div style={{ fontSize: 40, fontWeight: 800, display: "flex" }}>${value.toFixed(0)}</div>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", border: "2px solid rgba(224,178,82,0.7)", borderRadius: 18, padding: "14px 22px", background: "rgba(224,178,82,0.10)" }}>
                <div style={{ fontSize: 20, color: "#cdbf9e", display: "flex" }}>Mana curve</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 48, marginTop: 4 }}>
                  {curve.map((b) => (
                    <div key={b.cmc} style={{ width: 16, height: Math.max(3, Math.round((b.count / maxCurve) * 48)), background: "#e0b252", borderRadius: 3, display: "flex" }} />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#e0b252", display: "flex" }}>{SITE.name}</div>
              <div style={{ fontSize: 22, color: "#cdbf9e", display: "flex" }}>{SITE.url.replace(/^https?:\/\//, "")}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } }
  );
}
