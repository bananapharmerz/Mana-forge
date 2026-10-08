-- CreateTable
CREATE TABLE "CardPrice" (
    "scryfallId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "setName" TEXT,
    "imageUrl" TEXT,
    "usd" REAL,
    "usdFoil" REAL,
    "eur" REAL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CardPriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scryfallId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "usd" REAL,
    "usdFoil" REAL
);

-- CreateTable
CREATE TABLE "PriceWatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "scryfallId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetUsd" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CardPrice_name_idx" ON "CardPrice"("name");

-- CreateIndex
CREATE INDEX "CardPriceHistory_day_idx" ON "CardPriceHistory"("day");

-- CreateIndex
CREATE UNIQUE INDEX "CardPriceHistory_scryfallId_day_key" ON "CardPriceHistory"("scryfallId", "day");

-- CreateIndex
CREATE INDEX "PriceWatch_userId_idx" ON "PriceWatch"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceWatch_userId_scryfallId_key" ON "PriceWatch"("userId", "scryfallId");
