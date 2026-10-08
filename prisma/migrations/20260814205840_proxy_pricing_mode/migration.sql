-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProxyOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "shippingAddress" TEXT NOT NULL,
    "cards" TEXT NOT NULL,
    "cardCount" INTEGER NOT NULL,
    "pricingMode" TEXT NOT NULL DEFAULT 'per-card',
    "totalCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripeSessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProxyOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProxyOrder" ("cardCount", "cards", "createdAt", "email", "id", "shippingAddress", "status", "stripeSessionId", "totalCents", "userId") SELECT "cardCount", "cards", "createdAt", "email", "id", "shippingAddress", "status", "stripeSessionId", "totalCents", "userId" FROM "ProxyOrder";
DROP TABLE "ProxyOrder";
ALTER TABLE "new_ProxyOrder" RENAME TO "ProxyOrder";
CREATE INDEX "ProxyOrder_userId_idx" ON "ProxyOrder"("userId");
CREATE INDEX "ProxyOrder_stripeSessionId_idx" ON "ProxyOrder"("stripeSessionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
