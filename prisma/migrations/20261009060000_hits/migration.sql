-- CreateTable
CREATE TABLE "Hit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitor" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "ref" TEXT,
    "source" TEXT,
    "country" TEXT,
    "device" TEXT,
    "ms" INTEGER,
    "scroll" INTEGER,
    "target" TEXT
);

-- CreateIndex
CREATE INDEX "Hit_at_idx" ON "Hit"("at");

-- CreateIndex
CREATE INDEX "Hit_path_at_idx" ON "Hit"("path", "at");
