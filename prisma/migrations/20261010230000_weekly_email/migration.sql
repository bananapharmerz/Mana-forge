-- Weekly roundup email (opt-in)
ALTER TABLE "User" ADD COLUMN "weeklyEmail" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "weeklyEmailConsentAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "weeklyEmailSentAt" DATETIME;
