import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const updated = await prisma.coupon.update({
      where: { id: parseInt(params.id) },
      data: {
        type: b.type === "fixed" ? "fixed" : "percent",
        value: parseFloat(b.value) || 0,
        minSubtotal: parseFloat(b.minSubtotal) || 0,
        maxDiscount: b.maxDiscount != null && b.maxDiscount !== "" ? parseFloat(b.maxDiscount) : null,
        usageLimit: b.usageLimit != null && b.usageLimit !== "" ? parseInt(b.usageLimit) : null,
        perUserLimit: b.perUserLimit != null && b.perUserLimit !== "" ? parseInt(b.perUserLimit) : null,
        expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
        active: !!b.active
      }
    });
    return NextResponse.json(updated);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.coupon.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
