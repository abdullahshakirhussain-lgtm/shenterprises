import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const id = parseInt(params.id);
    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: b.name,
        description: b.description || null,
        price: parseFloat(b.price) || 0,
        salePrice: b.salePrice != null && b.salePrice !== "" ? parseFloat(b.salePrice) : null,
        sku: b.sku || null,
        stock: parseInt(b.stock) || 0,
        imageUrl: b.imageUrl || null,
        categoryId: b.categoryId || null,
        onOffer: !!b.onOffer,
        featured: !!b.featured,
        active: b.active !== false,
        metaTitle: b.metaTitle || null,
        metaDesc: b.metaDesc || null
      }
    });
    return NextResponse.json(updated);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.product.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
