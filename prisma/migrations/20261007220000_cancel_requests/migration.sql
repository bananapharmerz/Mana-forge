-- CreateTable
CREATE TABLE "CancelRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "CancelRequest_status_createdAt_idx" ON "CancelRequest"("status", "createdAt");
