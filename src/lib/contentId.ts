/**
 * Canonical product identifier used EVERYWHERE Meta/Google see a product:
 * Pixel content_ids, Conversions API, a future Meta Product Catalog, and a
 * future Google Merchant feed.
 *
 * Product.sku is the real retail identifier but it's nullable in our data, so
 * we fall back to a stable synthetic id derived from the numeric primary key.
 * Keeping this in ONE function guarantees the id never drifts between systems.
 */
export function contentId(p: { sku?: string | null; id: number }): string {
  const sku = (p.sku || "").trim();
  return sku.length > 0 ? sku : `SHE-${p.id}`;
}
