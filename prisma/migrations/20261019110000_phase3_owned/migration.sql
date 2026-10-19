-- Profile Phase 3 (per-deck win rate) + owned-card inventory.
--
-- GameLog.deckId: optional link to one of the member's own decks so win-rate can be shown per
-- deck. No DB-level foreign key is added here — SQLite cannot ALTER-ADD a FK without rebuilding
-- the table, and this repo's migrations add columns plainly. The relation's SetNull behaviour is
-- emulated in app code (deleteDeckAction clears deckId before deleting a deck), and the
-- commanderName snapshot on each log is kept regardless, so history survives a deck deletion.
ALTER TABLE "GameLog" ADD COLUMN "deckId" TEXT;
CREATE INDEX "GameLog_deckId_idx" ON "GameLog"("deckId");

-- OwnedCard: the member's real-world card inventory, kept SEPARATE from the pack-opening
-- CollectionCard game. One row per (user, normalized name); matched to deck cards by name.
CREATE TABLE "OwnedCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OwnedCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OwnedCard_userId_nameKey_key" ON "OwnedCard"("userId", "nameKey");
CREATE INDEX "OwnedCard_userId_idx" ON "OwnedCard"("userId");
