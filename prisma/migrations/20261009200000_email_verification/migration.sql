-- Email confirmation. Accounts that already exist are treated as confirmed.
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" DATETIME;
UPDATE "User" SET "emailVerifiedAt" = "createdAt";

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerification_tokenHash_key" ON "EmailVerification"("tokenHash");
CREATE INDEX "EmailVerification_userId_idx" ON "EmailVerification"("userId");
