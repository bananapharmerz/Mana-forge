-- Manual game log: a member records their own games (paper or online) for profile win-rate/stats.
CREATE TABLE "GameLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "won" BOOLEAN NOT NULL,
    "commanderName" TEXT,
    "players" INTEGER NOT NULL DEFAULT 4,
    "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "GameLog_userId_playedAt_idx" ON "GameLog"("userId", "playedAt");
