-- Profile picture: a preset avatar key (see src/lib/avatars.ts). Null = a default picked from the name.
ALTER TABLE "User" ADD COLUMN "avatar" TEXT;
