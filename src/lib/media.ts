import path from "node:path";

// Short-lived public media (Nexus's finished social videos) so Buffer can download them.
// Stored next to the database in /data/media and deleted after a week.
export const MEDIA_DAYS = 7;
export const MEDIA_MAX_BYTES = 95 * 1024 * 1024; // Cloudflare's upload limit is 100 MB
export const MEDIA_NAME = /^[a-f0-9]{24}\.(mp4|jpg|png)$/;
export const mediaDir = () => path.join(path.dirname(process.env.DATABASE_PATH || path.join(process.cwd(), "dev.db")), "media");
export const MEDIA_TYPES: Record<string, string> = { mp4: "video/mp4", jpg: "image/jpeg", png: "image/png" };
