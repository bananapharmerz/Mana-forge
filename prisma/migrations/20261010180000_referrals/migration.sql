-- Refer a friend
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN "referredById" TEXT;
ALTER TABLE "User" ADD COLUMN "referralRewardedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "referralRewards" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
CREATE INDEX "User_referredById_idx" ON "User"("referredById");
