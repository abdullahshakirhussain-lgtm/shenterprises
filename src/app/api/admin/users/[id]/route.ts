import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const updated = await prisma.user.update({
      where: { id: parseInt(params.id) },
      data: { discountRate: Math.max(0, Math.min(100, parseFloat(b.discountRate) || 0)) }
    });
    return NextResponse.json({ id: updated.id, discountRate: updated.discountRate });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
