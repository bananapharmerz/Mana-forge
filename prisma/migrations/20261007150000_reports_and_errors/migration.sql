-- CreateTable
CREATE TABLE "DeckReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deckId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "reporterId" TEXT,
    "ipHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "digest" TEXT,
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "kind" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "DeckReport_status_createdAt_idx" ON "DeckReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DeckReport_deckId_idx" ON "DeckReport"("deckId");

-- CreateIndex
CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");
