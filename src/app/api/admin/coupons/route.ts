import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(coupons);
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.code) return NextResponse.json({ error: "Code required" }, { status: 400 });
    const code = String(b.code).trim().toUpperCase();
    const created = await prisma.coupon.create({
      data: {
        code,
        type: b.type === "fixed" ? "fixed" : "percent",
        value: parseFloat(b.value) || 0,
        minSubtotal: parseFloat(b.minSubtotal) || 0,
        maxDiscount: b.maxDiscount != null && b.maxDiscount !== "" ? parseFloat(b.maxDiscount) : null,
        usageLimit: b.usageLimit != null && b.usageLimit !== "" ? parseInt(b.usageLimit) : null,
        perUserLimit: b.perUserLimit != null && b.perUserLimit !== "" ? parseInt(b.perUserLimit) : null,
        expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
        active: b.active !== false
      }
    });
    return NextResponse.json(created);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
