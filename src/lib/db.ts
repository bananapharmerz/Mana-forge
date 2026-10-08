import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Local: dev.db in the project folder. On the server: DATABASE_PATH (a persistent volume).
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_PATH || path.join(process.cwd(), "dev.db"),
});

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
