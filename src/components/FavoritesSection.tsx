import { getMyFavorites } from "@/app/actions/favorites";
import SiteDeckCard from "./SiteDeckCard";
import PublicDeckCard from "./PublicDeckCard";

export default async function FavoritesSection({ currentUserId }: { currentUserId?: string }) {
  if (!currentUserId) return null;

  const { items, commanderImages } = await getMyFavorites();
  if (items.length === 0) return null;

  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-foreground">Your Favorites</h2>
      <p className="mt-1 text-sm text-muted">Decks you&apos;ve favorited, newest first.</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {items.map((item) =>
          item.kind === "site" ? (
            <SiteDeckCard
              key={`fav-site-${item.deck.id}`}
              deck={item.deck}
              commanderImageUrl={commanderImages[item.deck.commanderName]}
              isOwnDeck={item.deck.ownerId === currentUserId}
              isFavorited
              signedIn
            />
          ) : (
            <PublicDeckCard
              key={`fav-edhrec-${item.deck.urlhash}`}
              deck={item.deck}
              source={item.source}
              commanderName={item.commanderName}
              commanderImageUrl={commanderImages[item.commanderName]}
              isFavorited
              signedIn
            />
          )
        )}
      </div>
    </div>
  );
}
