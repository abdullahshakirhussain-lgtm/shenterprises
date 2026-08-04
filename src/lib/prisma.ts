import { PrismaClient } from "@prisma/client";

/**
 * Bound the runtime connection pool so we can never exhaust Supabase's pooler
 * client cap (15 in session mode). Without an explicit `connection_limit`,
 * Prisma opens its default pool (num_cpus * 2 + 1) and a burst of parallel
 * queries (e.g. the admin analytics dashboard) throws
 * "max clients reached in session mode - pool_size: 15".
 *
 * We append the params with string concatenation on purpose — NOT `new URL()`,
 * which would percent-encode the `@` that appears in the Supabase pooler
 * password and silently break authentication. connection_limit=5 keeps some
 * parallelism while staying far under the 15-client cap for our instance count;
 * pgbouncer=true disables prepared statements (required for the transaction
 * pooler, harmless elsewhere).
 */
function tunedUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  let url = raw;
  if (!/[?&]connection_limit=/.test(url)) url += (url.includes("?") ? "&" : "?") + "connection_limit=5";
  if (!/[?&]pgbouncer=/.test(url)) url += "&pgbouncer=true";
  return url;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const url = tunedUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(url ? { datasources: { db: { url } } } : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
