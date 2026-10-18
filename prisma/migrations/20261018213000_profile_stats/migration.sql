-- Customisable profile: a JSON array of the stat keys the member chose to show on their profile
-- (e.g. ["publicDecks","upvotes","cardsOwned"]). Null falls back to the default set.
ALTER TABLE "User" ADD COLUMN "profileStats" TEXT;
