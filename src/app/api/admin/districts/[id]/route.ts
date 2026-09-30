import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const b = await req.json();
    const updated = await prisma.district.update({
      where: { id: parseInt(params.id) },
      data: { deliveryFee: parseFloat(b.deliveryFee) || 0 }
    });
    return NextResponse.json(updated);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
