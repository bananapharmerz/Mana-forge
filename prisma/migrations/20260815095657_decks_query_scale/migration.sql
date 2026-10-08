-- CreateTable
CREATE TABLE "CategoryMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categorySlug" TEXT NOT NULL,
    "commanderName" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "CategoryMatch_categorySlug_idx" ON "CategoryMatch"("categorySlug");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryMatch_categorySlug_commanderName_key" ON "CategoryMatch"("categorySlug", "commanderName");

-- CreateIndex
CREATE INDEX "Deck_isPublic_updatedAt_idx" ON "Deck"("isPublic", "updatedAt");
