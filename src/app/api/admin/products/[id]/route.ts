import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const id = parseInt(params.id);

    // True partial update: only set fields that are explicitly present in the body.
    // Sending `{imageUrl: "..."}` updates ONLY imageUrl — everything else is left alone.
    const data: any = {};

    if (b.name !== undefined)        data.name = b.name;
    if (b.description !== undefined) data.description = b.description || null;
    if (b.price !== undefined)       data.price = parseFloat(b.price) || 0;
    if (b.salePrice !== undefined)   data.salePrice = b.salePrice == null || b.salePrice === "" ? null : parseFloat(b.salePrice);
    if (b.sku !== undefined)         data.sku = b.sku || null;
    if (b.stock !== undefined)       data.stock = parseInt(b.stock) || 0;
    if (b.unitQty !== undefined)     data.unitQty = b.unitQty == null || b.unitQty === "" ? null : parseInt(b.unitQty);
    if (b.unitType !== undefined)    data.unitType = b.unitType || null;
    if (b.imageUrl !== undefined)    data.imageUrl = b.imageUrl || null;
    if (b.images !== undefined)      data.images = typeof b.images === "string" ? b.images : (Array.isArray(b.images) ? JSON.stringify(b.images) : null);
    if (b.categoryId !== undefined)  data.categoryId = b.categoryId || null;
    if (b.onOffer !== undefined)     data.onOffer = !!b.onOffer;
    if (b.featured !== undefined)    data.featured = !!b.featured;
    if (b.active !== undefined)      data.active = b.active !== false;
    if (b.metaTitle !== undefined)   data.metaTitle = b.metaTitle || null;
    if (b.metaDesc !== undefined)    data.metaDesc = b.metaDesc || null;

    const updated = await prisma.product.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const orderCount = await prisma.orderItem.count({ where: { productId: id } });
    if (orderCount > 0) {
      return NextResponse.json({
        error: `Cannot delete — this product has been used in ${orderCount} order(s). Mark it as Hidden instead (uncheck Active in the edit form).`
      }, { status: 400 });
    }
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
