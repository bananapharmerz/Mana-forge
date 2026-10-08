// Shared browser-event contract so every FavoriteButton instance (which can render more than
// once for the same deck — e.g. the Favorites section and the main feed both showing it) and
// the feed list itself stay in sync without a full page refresh.
export const FAVORITE_TOGGLED_EVENT = "manaforge:favorite-toggled";

export interface FavoriteToggledDetail {
  key: string;
  favorited: boolean;
}
