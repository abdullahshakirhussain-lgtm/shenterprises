import { PrismaClient } from "@prisma/client";
import { invalidateCatalog } from "./memo";

/**
 * Keep each process's pool small. Deployment replica counts and other clients
 * still need to fit within the database pooler's total connection allowance.
 * Preserve the original URL encoding when appending pool configuration.
 */
function tunedUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  let url = raw;
  // The background worker needs only one connection, even with an explicit web limit.
  if (process.env.SH_WORKER) url = url.replace(/([?&])connection_limit=[^&]*/, "$1connection_limit=1");
  if (!/[?&]connection_limit=/.test(url)) url += (url.includes("?") ? "&" : "?") + (process.env.SH_WORKER ? "connection_limit=1" : "connection_limit=3");
  if (!/[?&]pgbouncer=/.test(url)) url += "&pgbouncer=true";
  if (!/[?&]pool_timeout=/.test(url)) url += "&pool_timeout=10";
  return url;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const url = tunedUrl(process.env.DATABASE_URL);

// Models whose rows appear on public pages. Any write to one of them — from
// admin, reviews, settings or anything added later — drops the in-process
// catalog cache (lib/memo.ts) so the next visitor sees the change.
const CATALOG_MODELS = new Set(["Category", "Product", "ProductVariant", "Coupon", "Review", "Setting", "Banner", "Machine", "MachineType", "District", "City"]);
const WRITE_OPS = new Set(["create", "createMany", "createManyAndReturn", "update", "updateMany", "upsert", "delete", "deleteMany"]);

function createClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(url ? { datasources: { db: { url } } } : {}),
  });
  // Query extensions don't change the client's types, so the cast is safe.
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const result = await query(args);
          if (WRITE_OPS.has(operation) && CATALOG_MODELS.has(model)) { invalidateCatalog(); scheduleRewarm(); }
          return result;
        },
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createClient();

// After a catalog change, re-render the busiest pages in the background so the
// first shopper after an admin save still gets a cached (fast) page. Debounced
// so a burst of edits triggers one pass; a newer change restarts the pass.
// Web process only — the worker never serves pages.
let rewarmTimer: ReturnType<typeof setTimeout> | undefined;
let rewarmRun = 0;
function scheduleRewarm() {
  if (process.env.SH_WORKER || process.env.NODE_ENV !== "production") return;
  clearTimeout(rewarmTimer);
  rewarmTimer = setTimeout(() => void rewarm(++rewarmRun).catch(() => {}), 1500);
}
async function rewarm(run: number) {
  const base = `http://127.0.0.1:${process.env.PORT || "3000"}`;
  const [categories, products, machines, types] = await Promise.all([
    prisma.category.findMany({ select: { slug: true } }),
    prisma.product.findMany({ where: { active: true }, select: { slug: true }, orderBy: { updatedAt: "desc" } }),
    prisma.machine.findMany({ where: { active: true }, select: { slug: true } }),
    prisma.machineType.findMany({ select: { slug: true } }),
  ]);
  const paths = [
    "/", "/shop", "/shop?page=2", "/shop?page=3", "/catalog", "/machines", "/offers",
    ...categories.map(c => "/category/" + c.slug),
    ...types.map(t => "/machines/" + t.slug),
    ...products.map(p => "/product/" + p.slug), // recently edited first
    ...machines.map(m => "/machines/" + m.slug),
  ];
  for (const path of paths) {
    if (run !== rewarmRun) return;
    // x-forwarded-proto: the middleware otherwise redirects plain-http requests.
    await fetch(base + path, { headers: { "x-forwarded-proto": "https" } }).then(r => r.arrayBuffer()).catch(() => {});
  }
}

globalForPrisma.prisma = prisma;
