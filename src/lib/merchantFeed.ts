import { prisma } from "./prisma";
import { contentId } from "./contentId";
import { isAvailable, selectedPrice, effectivePrice } from "./commerce";
import { unitLabel } from "./utils";

/**
 * Google Merchant Center product feed (RSS 2.0 + g: namespace).
 *
 * - One item per purchasable option combination (size × colour × …), grouped by
 *   item_group_id, priced with the same sum rule as checkout. Each link carries
 *   ?v=<variant ids> so the product page opens with that option selected and its
 *   price showing — Google rejects items whose landing-page price differs.
 * - Out-of-stock products/options are left out entirely (we never show a price
 *   for anything out of stock). Enquire-only machines have no price, so they're
 *   not in the feed either.
 */
const SITE = process.env.SITE_URL || "https://shenterprises.lk";
const MAX_COMBOS = 60;
const TYPE_LABEL: Record<string, string> = { size: "Size", length: "Length", pack: "Pack", color: "Colour" };

const esc = (s: string) => s
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (n: number) => `${n.toFixed(2)} LKR`;
const tag = (name: string, value: string | null | undefined) => (value ? `<g:${name}>${esc(value)}</g:${name}>` : "");

type V = { id: number; type: string; name: string; price: number | null; salePrice: number | null; outOfStock: boolean; imageUrl: string | null };

export async function buildMerchantFeed(): Promise<string> {
  const products = await prisma.product.findMany({
    where: { active: true, outOfStock: false },
    include: { variants: { orderBy: { sortOrder: "asc" } }, category: { select: { name: true } } },
    orderBy: { id: "asc" },
  });

  const items: string[] = [];
  for (const p of products) {
    if (!isAvailable(p) || !p.imageUrl) continue;
    const groups = ["size", "length", "pack", "color"]
      .map(type => (p.variants as V[]).filter(v => v.type === type && !v.outOfStock))
      .filter(g => g.length > 0);
    const combos = groups.reduce<V[][]>((acc, g) => acc.flatMap(c => g.map(v => [...c, v])), [[]]).slice(0, MAX_COMBOS);
    const extraImages = (() => { try { const a = JSON.parse(p.images || "[]"); return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string").slice(0, 10) : []; } catch { return []; } })();
    const unit = unitLabel(p.unitQty, p.unitType);
    const baseId = contentId(p);
    const brand = /\bPRIME\b/i.test(p.name) ? "PRIME" : null;

    for (const combo of combos) {
      const price = selectedPrice(p, combo);
      if (!(price > 0)) continue;
      // Regular (pre-sale) price for the same selection, for g:sale_price.
      const pricedRegular = combo.filter(v => effectivePrice(v) != null).map(v => v.price ?? v.salePrice ?? 0);
      const regular = pricedRegular.length ? pricedRegular.reduce((a, b) => a + b, 0) : (p.price > 0 ? p.price : price);
      const onSale = regular > price + 0.005;
      const label = combo.map(v => `${TYPE_LABEL[v.type] || v.type}: ${v.name}`).join(", ");
      const title = `${p.name}${unit && !combo.some(v => v.type === "length") ? ` — ${unit}` : ""}${label ? ` (${label})` : ""}`.slice(0, 150);
      const colour = combo.find(v => v.type === "color");
      const size = combo.find(v => v.type === "size" || v.type === "length");
      const ids = combo.map(v => v.id);
      items.push([
        "<item>",
        tag("id", ids.length ? `${baseId}-v${ids.join("-")}` : baseId),
        ids.length ? tag("item_group_id", baseId) : "",
        tag("title", title),
        tag("description", (p.description || p.name).slice(0, 5000)),
        tag("link", `${SITE}/product/${p.slug}${ids.length ? `?v=${ids.join(",")}` : ""}`),
        tag("image_link", colour?.imageUrl || p.imageUrl),
        ...extraImages.filter(u => u !== p.imageUrl).map(u => tag("additional_image_link", u)),
        tag("availability", "in_stock"),
        tag("price", money(onSale ? regular : price)),
        onSale ? tag("sale_price", money(price)) : "",
        tag("condition", "new"),
        brand ? tag("brand", brand) : "",
        tag("identifier_exists", "no"),
        tag("product_type", p.category?.name || null),
        tag("color", colour?.name),
        tag("size", size?.name),
        "</item>",
      ].filter(Boolean).join(""));
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>SH Enterprises</title>
<link>${SITE}</link>
<description>Craft &amp; tailoring supplies — island-wide delivery in Sri Lanka</description>
${items.join("\n")}
</channel>
</rss>
`;
}
