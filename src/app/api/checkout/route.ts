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
  items: z.array(z.object({
    productId: z.number(),
    quantity: z.number().min(1),
    variantLabel: z.string().optional(),  // e.g. "Black, 1/2 inch, 144 yards"
    variantIds: z.array(z.number()).optional(),  // selected variant IDs — used for server-side price lookup
  })).min(1)
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    if (body.paymentMethod === "bank" && !body.bankSlipUrl) {
      return NextResponse.json({ error: "Bank slip is required for bank deposit" }, { status: 400 });
    }

    const user = await getCurrentUser();

    const ids = body.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, active: true },
      include: { variants: true },
    });
    if (products.length !== ids.length) return NextResponse.json({ error: "Some products are unavailable" }, { status: 400 });

    let subtotal = 0;
    const items = body.items.map((it) => {
      const p = products.find((p) => p.id === it.productId)!;
      if ((p as any).outOfStock) throw new Error(`${p.name} is currently out of stock`);
      // Check selected variants too — any out-of-stock variant blocks the order
      if (it.variantIds && it.variantIds.length > 0) {
        const blocked = p.variants.find(v => it.variantIds!.includes(v.id) && (v as any).outOfStock);
        if (blocked) throw new Error(`${p.name} (${blocked.name}) is currently out of stock`);
      }

      // Compute effective price using the universal SUM rule:
      // - Each priced variant contributes its effective amount.
      // - Unpriced variants contribute 0.
      // - If no priced variant selected, fall back to product base price.
      const basePrice = p.salePrice ?? p.price;
      let price = basePrice;
      if (it.variantIds && it.variantIds.length > 0) {
        const selected = p.variants.filter(v => it.variantIds!.includes(v.id));
        const pricedSelected = selected.filter(v => v.price != null || v.salePrice != null);
        if (pricedSelected.length > 0) {
          price = pricedSelected.reduce((sum, v) => sum + (v.salePrice ?? v.price ?? 0), 0);
        }
      }

      subtotal += price * it.quantity;
      const snapshotName = it.variantLabel ? `${p.name} — ${it.variantLabel}` : p.name;
      return { productId: p.id, name: snapshotName, price, quantity: it.quantity };
    });

    // Account discount (member)
    let accountDiscount = 0;
    if (user) {
      const globalRate = parseFloat((await getSetting("account_discount_percent")) || "0");
      const rate = user.discountRate > 0 ? user.discountRate : globalRate;
      if (rate > 0) accountDiscount = Math.round(subtotal * (rate / 100) * 100) / 100;
    }

    // New customer tier discount
    let tierDiscount = 0;
    if (user) {
      const tiersRaw = await getSetting("new_customer_tiers");
      if (tiersRaw) {
        try {
          const tiers: { order: number; percent: number }[] = JSON.parse(tiersRaw);
          if (tiers.length > 0) {
            const completedOrders = await prisma.order.count({
              where: { userId: user.id, status: { not: "cancelled" } },
            });
            const thisOrderNumber = completedOrders + 1;
            const tier = tiers.find((t) => t.order === thisOrderNumber);
            if (tier && tier.percent > 0) {
              tierDiscount = Math.round(subtotal * (tier.percent / 100) * 100) / 100;
            }
          }
        } catch {}
      }
    }

    // Coupon
    let couponDiscount = 0;
    let couponCode: string | undefined;
    if (body.couponCode) {
      const result = await applyCoupon(body.couponCode, subtotal - accountDiscount - tierDiscount, user?.id);
      if (!result.ok) return NextResponse.json({ error: result.reason || "Invalid coupon" }, { status: 400 });
      couponDiscount = result.discount;
      couponCode = result.code;
    }

    const discountedSubtotal = Math.max(0, subtotal - accountDiscount - tierDiscount - couponDiscount);
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
        tierDiscount,
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

    // Stock decrement removed — availability is now governed by the
    // explicit `outOfStock` flag, not a numeric counter.

    if (couponCode) {
      await prisma.coupon.update({ where: { code: couponCode }, data: { usedCount: { increment: 1 } } });
    }

    await prisma.cart.updateMany({ where: { id: sid }, data: { abandoned: false } });
    await recordEvent({ type: "purchase", value: total, meta: { orderNumber: order.orderNumber } });

    // Save delivery details on the user for autofill next time. Best-effort.
    if (user?.id) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            email: body.email || (user as any).email || null,
            addressLine1: body.addressLine1 || null,
            addressLine2: body.addressLine2 || null,
            districtName: body.districtName || null,
          },
        });
      } catch (e: any) {
        console.warn("[checkout] could not save user delivery details:", e?.message);
      }
    }

    // ---------- AI Helper attribution ----------
    // Look at recent chat sessions (last 7 days) without an attributed order yet,
    // and mark any suggestion whose product appears in this order as "inOrder".
    // Best-effort — never let attribution failure break the order flow.
    try {
      const orderedProductIds = items.map(it => it.productId);
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentSessions = await prisma.chatSession.findMany({
        where: {
          startedAt: { gte: cutoff },
          orderId: null,
          OR: [
            ...(user?.id ? [{ userId: user.id }] : []),
            // Anonymous match via browser cookie is handled client-side after success
          ],
        },
        select: { id: true },
        take: 30,
      });
      if (recentSessions.length > 0) {
        const sessionIds = recentSessions.map(s => s.id);
        // Mark matching suggestions
        await prisma.chatSuggestion.updateMany({
          where: {
            sessionId: { in: sessionIds },
            productId: { in: orderedProductIds },
            inOrderId: null,
          },
          data: { inOrderId: order.id },
        });
        // Attribute the session itself to this order (only first matching session — heuristic)
        const firstMatch = await prisma.chatSuggestion.findFirst({
          where: { sessionId: { in: sessionIds }, inOrderId: order.id },
          select: { sessionId: true },
          orderBy: { createdAt: "desc" },
        });
        if (firstMatch) {
          await prisma.chatSession.update({
            where: { id: firstMatch.sessionId },
            data: { orderId: order.id, attributedAt: new Date() },
          });
        }
      }
    } catch (e: any) {
      console.warn("[checkout] AI attribution failed (ignoring):", e?.message);
    }

    return NextResponse.json({ ok: true, orderNumber: order.orderNumber, orderId: order.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Order failed" }, { status: 400 });
  }
}
