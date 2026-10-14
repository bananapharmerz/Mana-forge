-- AlterTable: add color identity to pulled cards (nullable, backfilled from Scryfall)
ALTER TABLE "CollectionCard" ADD COLUMN "colors" TEXT;
