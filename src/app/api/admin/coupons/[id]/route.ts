import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    // True partial update — only touch fields explicitly present in the body.
    const data: any = {};
    if (b.type !== undefined)         data.type = b.type === "fixed" ? "fixed" : "percent";
    if (b.value !== undefined)        data.value = parseFloat(b.value) || 0;
    if (b.minSubtotal !== undefined)  data.minSubtotal = parseFloat(b.minSubtotal) || 0;
    if (b.maxDiscount !== undefined)  data.maxDiscount = b.maxDiscount == null || b.maxDiscount === "" ? null : parseFloat(b.maxDiscount);
    if (b.usageLimit !== undefined)   data.usageLimit = b.usageLimit == null || b.usageLimit === "" ? null : parseInt(b.usageLimit);
    if (b.perUserLimit !== undefined) data.perUserLimit = b.perUserLimit == null || b.perUserLimit === "" ? null : parseInt(b.perUserLimit);
    if (b.expiresAt !== undefined)    data.expiresAt = b.expiresAt ? new Date(b.expiresAt) : null;
    if (b.active !== undefined)       data.active = !!b.active;

    const updated = await prisma.coupon.update({ where: { id: parseInt(params.id) }, data });
    return NextResponse.json(updated);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.coupon.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
