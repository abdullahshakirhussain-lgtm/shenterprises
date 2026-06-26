import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { translateToSinhalaAndTamil } from "@/lib/translate";

// GET /api/admin/products/variants?productId=123
export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const productId = parseInt(req.nextUrl.searchParams.get("productId") || "");
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });
  const variants = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }]
  });
  return NextResponse.json(variants);
}

// POST — create a variant
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { productId, type, name, imageUrl, sortOrder, price, salePrice } = await req.json();
    if (!productId || !type || !name) return NextResponse.json({ error: "productId, type, name required" }, { status: 400 });
    if (!["color", "size", "length", "pack"].includes(type)) return NextResponse.json({ error: "type must be color, size, length, or pack" }, { status: 400 });

    // Auto-translate the variant name — never let translation failure block variant creation
    let tr: { si: string; ta: string } | null = null;
    try { tr = await translateToSinhalaAndTamil(name); } catch (e: any) {
      console.warn("[variants POST] translation failed (continuing):", e?.message);
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId: parseInt(productId),
        type,
        name,
        nameSi: tr?.si || null,
        nameTa: tr?.ta || null,
        imageUrl: imageUrl || null,
        sortOrder: sortOrder || 0,
        price: price != null && price !== "" ? parseFloat(price) : null,
        salePrice: salePrice != null && salePrice !== "" ? parseFloat(salePrice) : null,
      }
    });
    return NextResponse.json(variant);
  } catch (e: any) {
    console.error("[variants POST] failed:", e);
    return NextResponse.json({
      error: e?.message || "Failed to create variant",
      code: e?.code,
      meta: e?.meta,
    }, { status: 500 });
  }
}

// PATCH — update a variant's price (or other fields)
export async function PATCH(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, name, price, salePrice, imageUrl, sortOrder, outOfStock } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const data: any = {};
  if (name !== undefined) {
    data.name = name;
    // Re-translate when the English name changes
    const tr = await translateToSinhalaAndTamil(name);
    if (tr) { data.nameSi = tr.si; data.nameTa = tr.ta; }
  }
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;
  if (price !== undefined) data.price = price === null || price === "" ? null : parseFloat(price);
  if (salePrice !== undefined) data.salePrice = salePrice === null || salePrice === "" ? null : parseFloat(salePrice);
  if (outOfStock !== undefined) data.outOfStock = !!outOfStock;
  const variant = await prisma.productVariant.update({ where: { id: parseInt(id) }, data });
  return NextResponse.json(variant);
}

// DELETE /api/admin/products/variants?id=456
export async function DELETE(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = parseInt(req.nextUrl.searchParams.get("id") || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.productVariant.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
