/*
  Warnings:

  - You are about to drop the column `colorIdentity` on the `Deck` table. All the data in the column will be lost.
  - You are about to drop the column `commanderImage` on the `Deck` table. All the data in the column will be lost.
  - Added the required column `commanderData` to the `Deck` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Deck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "commanderName" TEXT NOT NULL,
    "commanderData" TEXT NOT NULL,
    "cards" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Deck_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Deck" ("cards", "commanderName", "createdAt", "id", "isPublic", "name", "ownerId", "updatedAt") SELECT "cards", "commanderName", "createdAt", "id", "isPublic", "name", "ownerId", "updatedAt" FROM "Deck";
DROP TABLE "Deck";
ALTER TABLE "new_Deck" RENAME TO "Deck";
CREATE INDEX "Deck_commanderName_idx" ON "Deck"("commanderName");
CREATE INDEX "Deck_ownerId_idx" ON "Deck"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
