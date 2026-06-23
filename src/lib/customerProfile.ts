/**
 * Customer Profile builder — Phase 1 of the customer-profiling system.
 *
 * Reads existing data (AnalyticsEvent, Order, Cart, ChatSession) and writes
 * one row per (browserId, userId?) into CustomerProfile. Pure heuristics for
 * now — no ML. Designed to be rebuilt incrementally every 15 min via cron.
 *
 * The interest vector is the unit-normalised average of embeddings of products
 * a customer has viewed/added/ordered. Used later for personalised recs and
 * "customers like you bought" via pgvector cosine similarity.
 */

import { prisma } from "./prisma";

export const CUSTOMER_TYPES = [
  "professional_tailor",
  "boutique_owner",
  "hobbyist",
  "bulk_event_buyer",
  "gifter",
  "student",
  "casual_browser",
  "unknown",
] as const;

export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export type ProfileInputs = {
  browserId: string;
  userId?: number | null;
  // events from last 90 days, ordered desc
  events: Array<{ type: string; productId: number | null; value: number | null; createdAt: Date }>;
  orders: Array<{ total: number; createdAt: Date; itemProductIds: number[]; usedCoupon: boolean }>;
  carts: Array<{ abandoned: boolean; total: number }>;
  chatSessionsCount: number;
  productsViewed: number[];
  productsAddedToCart: number[];
  productsOrdered: number[];
  deviceClass?: string | null;
  preferredLanguage?: string | null;
};

export type ProfileScores = {
  customerType: CustomerType;
  typeConfidence: number;
  engagementScore: number;
  ltv: number;
  aov: number;
  orderCount: number;
  cartAbandonmentRate: number;
  discountResponsiveness: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastOrderAt: Date | null;
  topCategories: string[];
  topPriceRange: number | null;
};

// =====================================================================
// Heuristic classifier
// =====================================================================

export function classify(inputs: ProfileInputs): { type: CustomerType; confidence: number } {
  const orderCount = inputs.orders.length;
  const ltv = inputs.orders.reduce((s, o) => s + o.total, 0);
  const aov = orderCount > 0 ? ltv / orderCount : 0;

  // Active in last 6 months?
  const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
  const recentOrders = inputs.orders.filter(o => o.createdAt.getTime() > sixMonthsAgo).length;

  // Largest single order
  const maxOrderValue = inputs.orders.reduce((m, o) => Math.max(m, o.total), 0);

  // Single very-large order with no follow-ups = event buyer
  if (orderCount <= 2 && maxOrderValue >= 15_000) {
    return { type: "bulk_event_buyer", confidence: 0.7 };
  }

  // High volume + high AOV = boutique owner
  if (recentOrders >= 3 && aov >= 15_000) {
    return { type: "boutique_owner", confidence: 0.85 };
  }

  // High volume + moderate AOV = professional tailor
  if (recentOrders >= 3 && aov >= 4_500) {
    return { type: "professional_tailor", confidence: 0.8 };
  }

  // Single order, moderate amount = hobbyist
  if (orderCount >= 1 && orderCount <= 2 && aov >= 800 && aov < 4_500) {
    return { type: "hobbyist", confidence: 0.6 };
  }

  // Very small single order = student
  if (orderCount >= 1 && aov < 800) {
    return { type: "student", confidence: 0.5 };
  }

  // No orders but high engagement (many chat sessions or product views) = casual browser
  if (orderCount === 0 && (inputs.chatSessionsCount >= 1 || inputs.productsViewed.length >= 3)) {
    return { type: "casual_browser", confidence: 0.55 };
  }

  // Single order, looks gift-like (one item, no follow-ups) = gifter
  if (orderCount === 1 && inputs.orders[0].itemProductIds.length <= 2) {
    return { type: "gifter", confidence: 0.45 };
  }

  return { type: "unknown", confidence: 0.2 };
}

// =====================================================================
// Scoring helpers
// =====================================================================

function calcEngagementScore(inputs: ProfileInputs): number {
  // Cap-and-mix: page views, cart adds, chat sessions, orders, all weighted
  const pageViews = inputs.events.filter(e => e.type === "page_view").length;
  const adds      = inputs.productsAddedToCart.length;
  const chats     = inputs.chatSessionsCount;
  const orders    = inputs.orders.length;

  // Asymptotic curve — diminishing returns past saturation
  const score =
    Math.min(20, pageViews * 0.5) +
    Math.min(20, adds * 4) +
    Math.min(15, chats * 5) +
    Math.min(45, orders * 12);
  return Math.min(100, score);
}

function calcDiscountResponsiveness(inputs: ProfileInputs): number {
  // Fraction of orders that used any coupon
  if (inputs.orders.length === 0) return 0;
  const withCoupon = inputs.orders.filter(o => o.usedCoupon).length;
  return Math.min(1, withCoupon / inputs.orders.length);
}

function calcCartAbandonmentRate(inputs: ProfileInputs): number {
  if (inputs.carts.length === 0) return 0;
  const abandoned = inputs.carts.filter(c => c.abandoned).length;
  return abandoned / inputs.carts.length;
}

export function computeScores(inputs: ProfileInputs): ProfileScores {
  const { type, confidence } = classify(inputs);

  const ltv = inputs.orders.reduce((s, o) => s + o.total, 0);
  const aov = inputs.orders.length > 0 ? ltv / inputs.orders.length : 0;

  const firstEvent = inputs.events[inputs.events.length - 1];
  const lastEvent = inputs.events[0];
  const lastOrder = inputs.orders[0]; // events list is desc; orders too

  return {
    customerType: type,
    typeConfidence: confidence,
    engagementScore: calcEngagementScore(inputs),
    ltv,
    aov,
    orderCount: inputs.orders.length,
    cartAbandonmentRate: calcCartAbandonmentRate(inputs),
    discountResponsiveness: calcDiscountResponsiveness(inputs),
    firstSeenAt: firstEvent?.createdAt ?? new Date(),
    lastSeenAt: lastEvent?.createdAt ?? new Date(),
    lastOrderAt: lastOrder?.createdAt ?? null,
    topCategories: [], // populated by the builder once it knows the catalog
    topPriceRange: null,
  };
}

// =====================================================================
// Interest vector — average of product embeddings the customer engaged with
// =====================================================================

/**
 * Average a list of vectors element-wise and L2-normalise the result.
 * Returns null when there are no vectors to average.
 */
function averageVectors(vectors: number[][]): number[] | null {
  if (vectors.length === 0) return null;
  const dim = vectors[0].length;
  const sum = new Array<number>(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) sum[i] += v[i];
  }
  for (let i = 0; i < dim; i++) sum[i] /= vectors.length;
  // L2 normalise
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += sum[i] * sum[i];
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < dim; i++) sum[i] /= norm;
  return sum;
}

/**
 * Fetch a customer's interest vector from the engagement product list.
 * Weighted: ordered products count 3×, added 2×, viewed 1×.
 * Returns null if no embeddings are found.
 */
export async function computeInterestVector(
  productsViewed: number[],
  productsAdded: number[],
  productsOrdered: number[]
): Promise<number[] | null> {
  const allIds = Array.from(new Set([...productsViewed, ...productsAdded, ...productsOrdered]));
  if (allIds.length === 0) return null;

  type Row = { id: number; vec: string | null };
  let rows: Row[] = [];
  try {
    rows = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT id, embedding::text AS vec FROM "Product" WHERE id = ANY($1::int[]) AND embedding IS NOT NULL`,
      allIds
    );
  } catch {
    return null;
  }

  const byId = new Map<number, number[]>();
  for (const r of rows) {
    if (!r.vec) continue;
    // Parse "[0.012,-0.087,...]"
    const stripped = r.vec.replace(/^\[|\]$/g, "");
    const parts = stripped.split(",").map(Number);
    if (parts.some(Number.isNaN)) continue;
    byId.set(r.id, parts);
  }

  const weighted: number[][] = [];
  for (const id of productsViewed)   { const v = byId.get(id); if (v) weighted.push(v); }
  for (const id of productsAdded)    { const v = byId.get(id); if (v) { weighted.push(v); weighted.push(v); } }
  for (const id of productsOrdered)  { const v = byId.get(id); if (v) { weighted.push(v); weighted.push(v); weighted.push(v); } }

  return averageVectors(weighted);
}

// =====================================================================
// Top categories / price range
// =====================================================================

export async function computeTopCategoriesAndPrice(
  productIds: number[]
): Promise<{ topCategories: string[]; topPriceRange: number | null }> {
  if (productIds.length === 0) return { topCategories: [], topPriceRange: null };
  try {
    const rows = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { price: true, salePrice: true, category: { select: { slug: true } } },
    });
    const catCount = new Map<string, number>();
    const prices: number[] = [];
    for (const r of rows) {
      const slug = r.category?.slug;
      if (slug) catCount.set(slug, (catCount.get(slug) || 0) + 1);
      const p = r.salePrice ?? r.price;
      if (p > 0) prices.push(p);
    }
    const topCategories = Array.from(catCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([slug]) => slug);
    prices.sort((a, b) => a - b);
    const median = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : null;
    return { topCategories, topPriceRange: median };
  } catch {
    return { topCategories: [], topPriceRange: null };
  }
}

// =====================================================================
// Main: rebuild profile for a single browserId
// =====================================================================

export async function rebuildProfile(browserId: string, userId?: number | null): Promise<{ ok: boolean; type?: CustomerType }> {
  // 1) Pull last 90 days of analytics events for this browser (and userId if signed)
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  let events: any[] = [];
  try {
    events = await prisma.$queryRawUnsafe<any[]>(
      `SELECT ae."type", ae."productId", ae."value", ae."createdAt"
       FROM "AnalyticsEvent" ae
       JOIN "AnalyticsSession" s ON s.id = ae."sessionId"
       WHERE ae."createdAt" >= $1 AND s.id = $2
       ORDER BY ae."createdAt" DESC
       LIMIT 1000`,
      since,
      browserId
    );
  } catch {
    events = [];
  }

  // 2) Orders — for signed-in users only (anon orders we can't link)
  let orders: any[] = [];
  if (userId) {
    const rows = await prisma.order.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      include: { items: { select: { productId: true } } },
    });
    orders = rows.map(o => ({
      total: o.total,
      createdAt: o.createdAt,
      itemProductIds: o.items.map(it => it.productId),
      usedCoupon: !!o.couponCode,
    }));
  }

  // 3) Carts (best-effort by session)
  const carts = await prisma.cart.findMany({
    where: { id: browserId },
    select: { abandoned: true, total: true },
  });

  // 4) Chat sessions
  let chatSessionsCount = 0;
  try {
    chatSessionsCount = await prisma.chatSession.count({
      where: {
        startedAt: { gte: since },
        OR: [{ browserId }, ...(userId ? [{ userId }] : [])],
      },
    });
  } catch {}

  // 5) Product engagement breakdown
  const productsViewed = Array.from(
    new Set(events.filter(e => e.type === "page_view" && e.productId).map(e => e.productId as number))
  );
  const productsAddedToCart = Array.from(
    new Set(events.filter(e => e.type === "add_to_cart" && e.productId).map(e => e.productId as number))
  );
  const productsOrdered = Array.from(
    new Set(orders.flatMap(o => o.itemProductIds))
  );

  const inputs: ProfileInputs = {
    browserId,
    userId,
    events,
    orders,
    carts,
    chatSessionsCount,
    productsViewed,
    productsAddedToCart,
    productsOrdered,
  };

  const scores = computeScores(inputs);
  const { topCategories, topPriceRange } = await computeTopCategoriesAndPrice([
    ...productsViewed,
    ...productsAddedToCart,
    ...productsOrdered,
  ]);
  scores.topCategories = topCategories;
  scores.topPriceRange = topPriceRange;

  // Skip if absolutely no signal
  if (
    events.length === 0 &&
    orders.length === 0 &&
    chatSessionsCount === 0 &&
    productsViewed.length === 0
  ) {
    return { ok: false };
  }

  const interestVec = await computeInterestVector(productsViewed, productsAddedToCart, productsOrdered);

  // Upsert
  await prisma.customerProfile.upsert({
    where: { browserId },
    create: {
      browserId,
      userId: userId ?? null,
      customerType: scores.customerType,
      typeConfidence: scores.typeConfidence,
      engagementScore: scores.engagementScore,
      ltv: scores.ltv,
      aov: scores.aov,
      orderCount: scores.orderCount,
      cartAbandonmentRate: scores.cartAbandonmentRate,
      discountResponsiveness: scores.discountResponsiveness,
      firstSeenAt: scores.firstSeenAt,
      lastSeenAt: scores.lastSeenAt,
      lastOrderAt: scores.lastOrderAt,
      topCategories: scores.topCategories.length ? JSON.stringify(scores.topCategories) : null,
      topPriceRange: scores.topPriceRange,
    },
    update: {
      userId: userId ?? undefined,
      customerType: scores.customerType,
      typeConfidence: scores.typeConfidence,
      engagementScore: scores.engagementScore,
      ltv: scores.ltv,
      aov: scores.aov,
      orderCount: scores.orderCount,
      cartAbandonmentRate: scores.cartAbandonmentRate,
      discountResponsiveness: scores.discountResponsiveness,
      lastSeenAt: scores.lastSeenAt,
      lastOrderAt: scores.lastOrderAt,
      topCategories: scores.topCategories.length ? JSON.stringify(scores.topCategories) : null,
      topPriceRange: scores.topPriceRange,
    },
  });

  // Write the interest vector via raw SQL (Prisma can't serialize vector)
  if (interestVec) {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "CustomerProfile" SET "interestVector" = $1::vector WHERE "browserId" = $2`,
        `[${interestVec.join(",")}]`,
        browserId
      );
    } catch {}
  }

  return { ok: true, type: scores.customerType };
}

// =====================================================================
// Bulk rebuild — iterates all known browser ids from analytics + users
// =====================================================================

export async function rebuildAllProfiles(): Promise<{ total: number; ok: number; failed: number }> {
  // Pull distinct browser ids from analytics sessions in the last 90 days
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT DISTINCT id FROM "AnalyticsSession" WHERE "lastSeen" >= $1 LIMIT 5000`,
    since
  );
  const browserIds = rows.map(r => r.id);

  let ok = 0, failed = 0;
  // Process in batches of 5 to keep db load reasonable
  for (let i = 0; i < browserIds.length; i += 5) {
    const batch = browserIds.slice(i, i + 5);
    const results = await Promise.all(batch.map(bid => rebuildProfile(bid).catch(() => ({ ok: false }))));
    for (const r of results) (r.ok ? ok++ : failed++);
  }

  return { total: browserIds.length, ok, failed };
}
