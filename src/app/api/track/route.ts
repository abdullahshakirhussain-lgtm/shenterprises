import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
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
      fullName: order.fullName,
      phone: order.phone,
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
