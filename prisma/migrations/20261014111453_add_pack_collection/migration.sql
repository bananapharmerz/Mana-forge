-- CreateTable
CREATE TABLE "CollectionCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "scryfallId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "setCode" TEXT NOT NULL,
    "setName" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "imageUrl" TEXT,
    "collectorNumber" TEXT,
    "scryfallUri" TEXT,
    "priceUsd" REAL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "foilQuantity" INTEGER NOT NULL DEFAULT 0,
    "firstPulledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollectionCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "priceAlerts" BOOLEAN NOT NULL DEFAULT true,
    "priceDigestAt" DATETIME,
    "emailVerifiedAt" DATETIME,
    "weeklyEmail" BOOLEAN NOT NULL DEFAULT false,
    "weeklyEmailConsentAt" DATETIME,
    "weeklyEmailSentAt" DATETIME,
    "referralCode" TEXT,
    "referredById" TEXT,
    "referralRewardedAt" DATETIME,
    "referralRewards" INTEGER NOT NULL DEFAULT 0,
    "communityOptInAt" DATETIME,
    "packRipsDate" TEXT,
    "packRipsToday" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("communityOptInAt", "createdAt", "email", "emailVerifiedAt", "id", "name", "passwordHash", "priceAlerts", "priceDigestAt", "referralCode", "referralRewardedAt", "referralRewards", "referredById", "sessionVersion", "stripeCustomerId", "stripeSubscriptionId", "tier", "weeklyEmail", "weeklyEmailConsentAt", "weeklyEmailSentAt") SELECT "communityOptInAt", "createdAt", "email", "emailVerifiedAt", "id", "name", "passwordHash", "priceAlerts", "priceDigestAt", "referralCode", "referralRewardedAt", "referralRewards", "referredById", "sessionVersion", "stripeCustomerId", "stripeSubscriptionId", "tier", "weeklyEmail", "weeklyEmailConsentAt", "weeklyEmailSentAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
CREATE INDEX "User_stripeCustomerId_idx" ON "User"("stripeCustomerId");
CREATE INDEX "User_stripeSubscriptionId_idx" ON "User"("stripeSubscriptionId");
CREATE INDEX "User_referredById_idx" ON "User"("referredById");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CollectionCard_userId_idx" ON "CollectionCard"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionCard_userId_scryfallId_key" ON "CollectionCard"("userId", "scryfallId");
