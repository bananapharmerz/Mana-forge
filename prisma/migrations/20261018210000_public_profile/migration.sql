-- Public profile (/u/<username>): a social-style profile page.
-- username is a unique handle (null until the member picks one); publicProfile/showCollection are
-- opt-in toggles; bio is a short free-text line.
ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "usernameDisplay" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "publicProfile" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "showCollection" BOOLEAN NOT NULL DEFAULT false;

-- Unique handle. SQLite treats NULLs as distinct, so accounts without a username don't collide.
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
