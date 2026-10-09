-- AlterTable
ALTER TABLE "User" ADD COLUMN "priceAlerts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "priceDigestAt" DATETIME;

-- AlterTable
ALTER TABLE "PriceWatch" ADD COLUMN "alertedAt" DATETIME;
