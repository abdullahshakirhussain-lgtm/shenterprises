import { randomInt } from "crypto";
import { prisma } from "./prisma";

/**
 * Post-delivery review requests.
 *
 * Orders here stop at "shipped" (delivery takes up to 3 days), so a request is
 * queued 4 days after an order is marked shipped/delivered. Each request is an
 * OrderJob (kind "review_request") whose context holds a random link code; the
 * order worker texts https://shenterprises.lk/r/<code>, and that page lets the
 * customer rate their items without logging in. A second job kind,
 * "review_done", records that the order has been reviewed (unique per order).
 */
export const REVIEW_KIND = "review_request";
export const REVIEW_DONE_KIND = "review_done";
// Only orders shipped from launch onwards — past customers never get a surprise text.
const REQUESTS_FROM = new Date("2026-10-02T00:00:00+05:30");
const DELAY_MS = 4 * 86400_000;
export const LINK_VALID_MS = 60 * 86400_000;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
export function newReviewCode() {
  let s = "";
  for (let i = 0; i < 10; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

/** Queue review requests for orders shipped ≥4 days ago (called by the order worker). */
export async function queueReviewRequests() {
  const due = await prisma.order.findMany({
    where: {
      status: { in: ["shipped", "delivered"] },
      updatedAt: { gte: REQUESTS_FROM, lte: new Date(Date.now() - DELAY_MS) },
      jobs: { none: { kind: REVIEW_KIND } },
    },
    select: { id: true },
    take: 50,
  });
  if (!due.length) return 0;
  const res = await prisma.orderJob.createMany({
    data: due.map(o => ({ orderId: o.id, kind: REVIEW_KIND, context: newReviewCode() })),
    skipDuplicates: true,
  });
  return res.count;
}

/** The order behind a review link, or null if the code is unknown or expired. */
export async function findReviewOrder(code: string) {
  if (!/^[A-Za-z0-9]{10}$/.test(code)) return null;
  const job = await prisma.orderJob.findFirst({
    where: { kind: REVIEW_KIND, context: code, createdAt: { gte: new Date(Date.now() - LINK_VALID_MS) } },
    select: {
      order: {
        select: {
          id: true, orderNumber: true, fullName: true,
          jobs: { where: { kind: REVIEW_DONE_KIND }, select: { id: true } },
          items: { select: { productId: true, name: true, product: { select: { slug: true, imageUrl: true, active: true } } } },
        },
      },
    },
  });
  if (!job) return null;
  const o = job.order;
  // One entry per product, even if it was bought in several options.
  const seen = new Set<number>();
  const items = o.items.filter(i => i.product.active && !seen.has(i.productId) && seen.add(i.productId))
    .map(i => ({ productId: i.productId, name: i.name.split(" — ")[0], slug: i.product.slug, imageUrl: i.product.imageUrl }));
  return { orderId: o.id, orderNumber: o.orderNumber, fullName: o.fullName, alreadyReviewed: o.jobs.length > 0, items };
}

/** "Nimal Perera" → "Nimal P." — shown on the review. */
export function reviewerName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return (parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0] || "Customer").slice(0, 40);
}
