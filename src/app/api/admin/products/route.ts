import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    const slug = await uniqueSlug(slugify(b.name));
    const created = await prisma.product.create({
      data: {
        name: b.name,
        slug,
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
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

async function uniqueSlug(base: string) {
  let s = base || "product"; let i = 1;
  while (await prisma.product.findUnique({ where: { slug: s } })) { s = `${base}-${++i}`; }
  return s;
}
