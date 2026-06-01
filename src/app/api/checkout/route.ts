import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateDeliveryFee } from "@/lib/koombiyo";
import { generateOrderNumber } from "@/lib/utils";
import { z } from "zod";
import { getOrCreateSessionId, recordEvent } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/userAuth";
import { applyCoupon } from "@/lib/coupons";
import { getSetting } from "@/lib/settings";

const schema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  districtName: z.string().min(1),
  cityName: z.string().min(1),
  notes: z.string().optional(),
  paymentMethod: z.enum(["cod", "bank"]),
  bankSlipUrl: z.string().optional(),
  couponCode: z.string().optional(),
  items: z.array(z.object({ productId: z.number(), quantity: z.number().min(1) })).min(1)
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    if (body.paymentMethod === "bank" && !body.bankSlipUrl) {
      return NextResponse.json({ error: "Bank slip is required for bank deposit" }, { status: 400 });
    }

    const user = await getCurrentUser();

    const ids = body.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: ids }, active: true } });
    if (products.length !== ids.length) return NextResponse.json({ error: "Some products are unavailable" }, { status: 400 });

    let subtotal = 0;
    const items = body.items.map((it) => {
      const p = products.find((p) => p.id === it.productId)!;
      const price = p.salePrice ?? p.price;
      if (p.stock < it.quantity) throw new Error(`Insufficient stock for ${p.name}`);
      subtotal += price * it.quantity;
      return { productId: p.id, name: p.name, price, quantity: it.quantity };
    });

    // Account discount (member)
    let accountDiscount = 0;
    if (user) {
      const globalRate = parseFloat((await getSetting("account_discount_percent")) || "0");
      const rate = user.discountRate > 0 ? user.discountRate : globalRate;
      if (rate > 0) accountDiscount = Math.round(subtotal * (rate / 100) * 100) / 100;
    }

    // Coupon
    let couponDiscount = 0;
    let couponCode: string | undefined;
    if (body.couponCode) {
      const result = await applyCoupon(body.couponCode, subtotal - accountDiscount, user?.id);
      if (!result.ok) return NextResponse.json({ error: result.reason || "Invalid coupon" }, { status: 400 });
      couponDiscount = result.discount;
      couponCode = result.code;
    }

    const discountedSubtotal = Math.max(0, subtotal - accountDiscount - couponDiscount);
    const { fee } = await calculateDeliveryFee(body.districtName, body.cityName, discountedSubtotal);
    const total = discountedSubtotal + fee;

    // Upsert customer for non-logged-in customers
    let customerId: number | null = null;
    if (!user && body.phone) {
      const customer = await prisma.customer.create({ data: { fullName: body.fullName, email: body.email || null, phone: body.phone } });
      customerId = customer.id;
    }

    const sid = getOrCreateSessionId();
    const session = await prisma.analyticsSession.findUnique({ where: { id: sid } });

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId,
        userId: user?.id ?? null,
        fullName: body.fullName,
        phone: body.phone,
        email: body.email || null,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2 || null,
        districtName: body.districtName,
        cityName: body.cityName,
        notes: body.notes || null,
        subtotal,
        accountDiscount,
        couponCode: couponCode || null,
        couponDiscount,
        deliveryFee: fee,
        total,
        paymentMethod: body.paymentMethod,
        bankSlipUrl: body.bankSlipUrl || null,
        status: "pending",
        sessionId: sid,
        source: session?.source || null,
        items: { create: items }
      }
    });

    await Promise.all(items.map((i) =>
      prisma.product.update({ where: { id: i.productId }, data: { stock: { decrement: i.quantity } } })
    ));

    if (couponCode) {
      await prisma.coupon.update({ where: { code: couponCode }, data: { usedCount: { increment: 1 } } });
    }

    await prisma.cart.updateMany({ where: { id: sid }, data: { abandoned: false } });
    await recordEvent({ type: "purchase", value: total, meta: { orderNumber: order.orderNumber } });

    return NextResponse.json({ ok: true, orderNumber: order.orderNumber, orderId: order.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Order failed" }, { status: 400 });
  }
}
