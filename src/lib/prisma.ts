import { PrismaClient, Prisma } from "@prisma/client";

export { Prisma };

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildDatasourceUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;
  // Prisma waits pool_timeout seconds for a free connection before throwing P2024.
  // Default is 10s — too short when export jobs hold the single Supabase pgbouncer connection.
  const url = new URL(base);
  if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "30");
  return url.toString();
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasourceUrl: buildDatasourceUrl(),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
