import { prisma } from "./prisma";

export type CouponResult = {
  ok: boolean;
  discount: number;
  reason?: string;
  code?: string;
};

export async function applyCoupon(code: string, subtotal: number, userId?: number | null): Promise<CouponResult> {
  if (!code) return { ok: false, discount: 0, reason: "No code provided" };
  const c = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!c) return { ok: false, discount: 0, reason: "Coupon not found" };
  if (!c.active) return { ok: false, discount: 0, reason: "Coupon is inactive" };
  if (c.expiresAt && c.expiresAt < new Date()) return { ok: false, discount: 0, reason: "Coupon expired" };
  if (subtotal < c.minSubtotal) return { ok: false, discount: 0, reason: `Minimum order Rs. ${c.minSubtotal} required` };
  if (c.usageLimit && c.usedCount >= c.usageLimit) return { ok: false, discount: 0, reason: "Coupon usage limit reached" };

  if (c.perUserLimit && userId) {
    const used = await prisma.order.count({ where: { userId, couponCode: c.code } });
    if (used >= c.perUserLimit) return { ok: false, discount: 0, reason: "You have already used this coupon" };
  }

  let discount = 0;
  if (c.type === "percent") {
    discount = subtotal * (c.value / 100);
    if (c.maxDiscount && discount > c.maxDiscount) discount = c.maxDiscount;
  } else if (c.type === "fixed") {
    discount = c.value;
  }
  if (discount > subtotal) discount = subtotal;
  return { ok: true, discount: Math.round(discount * 100) / 100, code: c.code };
}
