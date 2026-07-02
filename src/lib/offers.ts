import { prisma } from "./prisma";

/**
 * A product qualifies for the Offers page if EITHER:
 *   - it has a genuine sale price (salePrice > 0 and below the base price), OR
 *   - it's manually flagged onOffer by the admin.
 * The sale-price rule means any real discount shows up automatically — no need
 * to also tick the "On offer" box.
 */
export function isOfferProduct(p: { onOffer: boolean; price: number; salePrice: number | null }): boolean {
  if (p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price) return true;
  return !!p.onOffer;
}

/** Real discount percentage for a product, or 0 when there's no genuine markdown. */
export function discountPercent(p: { price: number; salePrice: number | null }): number {
  if (p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price) {
    return Math.round(((p.price - p.salePrice) / p.price) * 100);
  }
  return 0;
}

/**
 * Fetch all offer products (active + qualifying), newest-edited first.
 * Prisma can't compare two columns in a WHERE, so we cast a wide net at the DB
 * (onOffer OR any salePrice) then apply the genuine-discount rule in JS.
 */
export async function fetchOfferProducts(limit?: number) {
  const rows = await prisma.product.findMany({
    where: { active: true, OR: [{ onOffer: true }, { salePrice: { gt: 0 } }] },
    orderBy: { updatedAt: "desc" },
    include: { variants: true },
  });
  const filtered = rows.filter(isOfferProduct);
  return typeof limit === "number" ? filtered.slice(0, limit) : filtered;
}

/** Largest genuine discount % across a set of products (for the homepage banner). */
export function maxDiscountPercent(products: { price: number; salePrice: number | null }[]): number {
  return products.reduce((max, p) => Math.max(max, discountPercent(p)), 0);
}
