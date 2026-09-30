import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import { getSettings } from "./settings";
import { selectedPrice, validateSelection } from "./commerce";
import { applyCoupon } from "./coupons";
import { getDeliveryFee } from "./sriLankaDistricts";
export type QuoteInput = { items: { productId: number; quantity: number; variantIds?: number[] }[]; districtName: string; couponCode?: string; phone?: string };
export function loadCheckoutSettings() { return getSettings(["account_discount_percent", "new_customer_tiers", "free_delivery_threshold"]); }
export async function calculateCheckoutQuote(body: QuoteInput, user: { id: number; discountRate: number } | null, settings: Record<string,string>, db: Prisma.TransactionClient = prisma) {
    // Deduplicate — the same product can appear in multiple cart lines (one per
    // variant, e.g. the same zipper in Black and White). Comparing raw counts
    // against findMany (which returns each product once) would wrongly fail.
    const ids = body.items.map((i) => i.productId);
    const uniqueIds = Array.from(new Set(ids));
    const products = await db.product.findMany({
      where: { id: { in: uniqueIds }, active: true },
      include: { variants: true },
    });
    if (products.length !== uniqueIds.length) {
      const found = new Set(products.map((p) => p.id));
      const missing = uniqueIds.filter((id) => !found.has(id));
      console.warn("[checkout] unavailable product ids:", missing);
      throw new Error("Some products are unavailable. Please review your cart.");
    }

    let subtotal = 0;
    const items = body.items.map((it) => {
      const p = products.find((p) => p.id === it.productId)!;
      const selected = validateSelection(p, it.variantIds || []);
      const price = selectedPrice(p, selected);
      subtotal += price * it.quantity;
      const label = selected.map(v => v.name).join(", ");
      const snapshotName = label ? p.name + " — " + label : p.name;
      return { productId: p.id, name: snapshotName, price, quantity: it.quantity };
    });

    // Account discount (member)
    let accountDiscount = 0;
    if (user) {
      const globalRate = parseFloat(settings.account_discount_percent || "0");
      const rate = Math.max(0, Math.min(100, user.discountRate > 0 ? user.discountRate : globalRate));
      if (rate > 0) accountDiscount = Math.round(subtotal * (rate / 100) * 100) / 100;
    }

    // New customer tier discount
    let tierDiscount = 0;
    if (user) {
      const tiersRaw = settings.new_customer_tiers;
      if (tiersRaw) {
        try {
          const tiers: { order: number; percent: number }[] = JSON.parse(tiersRaw);
          if (tiers.length > 0) {
            const completedOrders = await db.order.count({
              where: { userId: user.id, status: { not: "cancelled" } },
            });
            const thisOrderNumber = completedOrders + 1;
            const tier = tiers.find((t) => t.order === thisOrderNumber);
            if (tier && Number.isFinite(tier.percent) && tier.percent > 0) {
              tierDiscount = Math.round(subtotal * (Math.min(100, tier.percent) / 100) * 100) / 100;
            }
          }
        } catch {}
      }
    }

    // Coupon
    let couponDiscount = 0;
    let couponCode: string | undefined;
    if (body.couponCode) {
      const result = await applyCoupon(body.couponCode, subtotal - accountDiscount - tierDiscount, user?.id, body.phone, db);
      if (!result.ok) throw new Error("Coupon: " + (result.reason || "Invalid coupon"));
      couponDiscount = result.discount;
      couponCode = result.code;
    }

    const discountedSubtotal = Math.max(0, subtotal - accountDiscount - tierDiscount - couponDiscount);
    const fee = Number(settings.free_delivery_threshold || 0) > 0 && discountedSubtotal >= Number(settings.free_delivery_threshold || 0) ? 0 : getDeliveryFee(body.districtName);
    const total = discountedSubtotal + fee;

    return { subtotal, accountDiscount, tierDiscount, couponDiscount, couponCode, fee, total, items };
}
