import { prisma } from "@/lib/prisma";

/**
 * Privacy-masked order shape shared by the confirmation page, the success page,
 * and /api/track — one source of truth so the three never drift.
 *
 * Masking: first name only + masked phone, so a leaked order link (or a guessed
 * order number) never exposes full PII. Order numbers are crypto-random.
 */
export type PublicOrder = {
  orderNumber: string;
  status: string;
  createdAt: string;
  fullName: string;
  phone: string | null;
  districtName: string;
  cityName: string;
  paymentMethod: string;
  subtotal: number;
  accountDiscount: number;
  tierDiscount: number;
  couponDiscount: number;
  deliveryFee: number;
  total: number;
  items: { name: string; quantity: number; price: number }[];
};

/** Mask all but the last 2 digits of a phone, e.g. 94771234567 -> •••••••••67 */
export function maskPhone(p: string | null): string | null {
  if (!p) return p;
  const tail = p.slice(-2);
  return "•".repeat(Math.max(0, p.length - 2)) + tail;
}

/** Load one order by its number as a masked receipt, or null if not found. */
export async function getPublicOrder(orderNumberRaw: string): Promise<PublicOrder | null> {
  const orderNumber = orderNumberRaw.trim().toUpperCase();
  if (!orderNumber) return null;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: { select: { name: true, quantity: true, price: true } } },
  });
  if (!order) return null;

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    fullName: order.fullName?.split(" ")[0] || order.fullName,
    phone: maskPhone(order.phone),
    districtName: order.districtName,
    cityName: order.cityName,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal,
    accountDiscount: order.accountDiscount,
    tierDiscount: order.tierDiscount,
    couponDiscount: order.couponDiscount,
    deliveryFee: order.deliveryFee,
    total: order.total,
    items: order.items,
  };
}
