-- AlterTable: mark whether a pulled card is a land (nullable, backfilled from Scryfall).
-- Lands become their own category at the end of the collection sort.
ALTER TABLE "CollectionCard" ADD COLUMN "isLand" BOOLEAN;
