import { edhrecDeckUrl, type EdhrecDeckSource, type EdhrecPublicDeck } from "@/lib/edhrec";
import { formatCents } from "@/lib/money";
import TypeBreakdownBar from "./TypeBreakdownBar";
import CardZoomThumbnail from "./CardZoomThumbnail";
import FavoriteButton from "./FavoriteButton";
import SaveEdhrecDeckButton from "./SaveEdhrecDeckButton";

export default function PublicDeckCard({
  deck,
  source,
  commanderName,
  commanderImageUrl,
  isFavorited,
  signedIn,
}: {
  deck: EdhrecPublicDeck;
  source: EdhrecDeckSource | null;
  commanderName?: string;
  commanderImageUrl?: string;
  isFavorited?: boolean;
  signedIn?: boolean;
}) {
  const href = source?.url ?? edhrecDeckUrl(deck.urlhash);

  return (
    <div className="card-frame flex flex-col gap-2 p-3">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-3 rounded-md transition-colors hover:bg-surface-raised"
      >
        {commanderImageUrl && (
          <CardZoomThumbnail src={commanderImageUrl} alt={commanderName ?? "Commander"} />
        )}
        <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
          {commanderName && (
            <span className="line-clamp-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {commanderName}
            </span>
          )}
          <TypeBreakdownBar
            counts={{
              creature: deck.creature,
              instant: deck.instant,
              sorcery: deck.sorcery,
              artifact: deck.artifact,
              enchantment: deck.enchantment,
              planeswalker: deck.planeswalker,
              land: deck.land,
            }}
          />
          <span className="text-xs text-muted">{deck.savedate}</span>
          <div className="mt-auto flex items-end justify-between gap-2">
            <span className="text-xs text-gold-bright">
              {source ? `By a builder on ${source.siteName} ↗` : "View decklist ↗"}
            </span>
            <span className="shrink-0 text-sm font-semibold text-foreground">
              {formatCents(deck.priceUsd * 100)}
            </span>
          </div>
        </div>
      </a>
      <div className="flex items-center gap-2">
        {commanderName ? (
          <SaveEdhrecDeckButton deck={deck} commanderName={commanderName} />
        ) : (
          <div className="flex-1" />
        )}
        <FavoriteButton
          kind="edhrec"
          deck={deck}
          commanderName={commanderName ?? ""}
          source={source}
          initialFavorited={isFavorited ?? false}
          signedIn={signedIn ?? false}
        />
      </div>
    </div>
  );
}
