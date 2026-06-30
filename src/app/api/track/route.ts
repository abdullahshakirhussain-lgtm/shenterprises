import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rateLimit";

// Mask all but the last 2 digits of a phone, e.g. 94771234567 -> ********67
function maskPhone(p: string | null): string | null {
  if (!p) return p;
  const tail = p.slice(-2);
  return "•".repeat(Math.max(0, p.length - 2)) + tail;
}

export async function GET(req: NextRequest) {
  // Throttle enumeration: 20 lookups per IP per minute
  const rl = rateLimit(`track:${clientIp(req)}`, 20, 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const orderNumber = req.nextUrl.searchParams.get("order")?.trim().toUpperCase();
  if (!orderNumber) return NextResponse.json({ error: "order number required" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: { select: { name: true, quantity: true, price: true } } }
  });

  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      // First name only + masked phone — enough for the customer to recognise
      // their order without exposing full PII to anyone holding the number.
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
    }
  });
}
