import type { MixedDeckItem } from "@/app/actions/decks";

export function itemKey(item: MixedDeckItem): string {
  return item.kind === "site" ? `site-${item.deck.id}` : `edhrec-${item.deck.urlhash}`;
}
