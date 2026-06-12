import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { translateToSinhalaAndTamil } from "@/lib/translate";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const data: any = { name: b.name };
    if (b.name) {
      const tr = await translateToSinhalaAndTamil(b.name);
      if (tr) { data.nameSi = tr.si; data.nameTa = tr.ta; }
    }
    const updated = await prisma.category.update({ where: { id: parseInt(params.id) }, data });
    return NextResponse.json(updated);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.product.updateMany({ where: { categoryId: parseInt(params.id) }, data: { categoryId: null } });
    await prisma.category.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
