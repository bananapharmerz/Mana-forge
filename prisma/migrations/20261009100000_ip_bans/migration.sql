-- CreateTable
CREATE TABLE "IpBan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ipHash" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "strikes" INTEGER NOT NULL,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "liftedAt" DATETIME,
    "liftNote" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "IpBan_code_key" ON "IpBan"("code");
CREATE INDEX "IpBan_ipHash_idx" ON "IpBan"("ipHash");
CREATE INDEX "IpBan_expiresAt_idx" ON "IpBan"("expiresAt");
