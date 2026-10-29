"use client";

import { useEffect, useState } from "react";
import { aboveTable, estimateDeck, loadGameChangers, roomBracketLabel, type RoomBracket } from "@/lib/bracketEstimate";

// On the join screen: if the table asked for a bracket and the picked deck looks stronger, say so
// gently. It never blocks joining; the playgroup decides, this just starts the conversation.
export default function BracketHint({ cards, table }: { cards: string[]; table: RoomBracket | undefined }) {
  const [list, setList] = useState<Set<string> | null>(null);
  const wanted = !!table && table !== "any" && cards.length > 0;
  useEffect(() => {
    if (!wanted) return;
    let live = true;
    loadGameChangers().then((l) => live && setList(l));
    return () => {
      live = false;
    };
  }, [wanted]);

  if (!table || table === "any") return null;
  // Game Changers list not loaded (or Scryfall down): show the table's bracket, but don't guess the deck's.
  const est = wanted && list && list.size > 0 ? estimateDeck(cards, list) : null;
  return (
    <p className={`mt-2 text-xs ${est && aboveTable(est.badge, table) ? "text-down" : "text-muted"}`}>
      This table plays {roomBracketLabel(table)}.
      {est && aboveTable(est.badge, table) && (
        <> This deck looks like Bracket {est.badge} by Mana Forge&apos;s own estimate (not an official Wizards rating): {est.text} Maybe check with the table first.</>
      )}
    </p>
  );
}
