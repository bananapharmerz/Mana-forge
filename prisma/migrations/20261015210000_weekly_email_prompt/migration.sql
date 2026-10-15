-- Records that a member has been shown the one-time "turn on the weekly roundup" nudge on My Decks
-- (set when they accept or dismiss it), so the ask is only ever made once.
ALTER TABLE "User" ADD COLUMN "weeklyEmailPromptedAt" DATETIME;
