import { createHash } from "crypto";
import { prisma } from "./prisma";
// Atomic database counters survive restarts and are shared by every web instance.
export async function persistentRateLimit(key: string, limit: number, seconds: number) {
 const id = createHash("sha256").update(key).digest("hex");
 const rows = await prisma.$queryRaw<{ count: number }[]> `
 INSERT INTO "RateLimitBucket" ("id", "count", "resetAt") VALUES (${id}, 1, NOW() + ${seconds} * INTERVAL '1 second')
 ON CONFLICT ("id") DO UPDATE SET
 "count" = CASE WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1 ELSE LEAST("RateLimitBucket"."count" + 1, ${limit + 1}) END,
 "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= NOW() THEN NOW() + ${seconds} * INTERVAL '1 second' ELSE "RateLimitBucket"."resetAt" END
 RETURNING "count"`;
 return { ok: rows[0].count <= limit };
}
