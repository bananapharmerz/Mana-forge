-- CreateTable
CREATE TABLE "ProxyOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "shippingAddress" TEXT NOT NULL,
    "cards" TEXT NOT NULL,
    "cardCount" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripeSessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProxyOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProxyOrder_userId_idx" ON "ProxyOrder"("userId");

-- CreateIndex
CREATE INDEX "ProxyOrder_stripeSessionId_idx" ON "ProxyOrder"("stripeSessionId");
