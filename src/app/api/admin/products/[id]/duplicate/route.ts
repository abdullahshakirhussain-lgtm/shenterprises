import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";

async function uniqueSlug(base: string) {
  let s = base || "product"; let i = 1;
  while (await prisma.product.findUnique({ where: { slug: s } })) s = `${base}-${++i}`;
  return s;
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = parseInt(params.id);
    const src = await prisma.product.findUnique({
      where: { id },
      include: { variants: true }
    });
    if (!src) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const newName = `${src.name} (Copy)`;
    const newSlug = await uniqueSlug(slugify(newName));

    const created = await prisma.product.create({
      data: {
        name: newName,
        slug: newSlug,
        description: src.description,
        price: src.price,
        salePrice: src.salePrice,
        sku: null, // SKU is usually unique — clear it
        stock: 0,  // Stock starts at 0 — admin sets it manually
        unitQty: src.unitQty,
        unitType: src.unitType,
        imageUrl: src.imageUrl,
        images: src.images,
        categoryId: src.categoryId,
        onOffer: src.onOffer,
        featured: false, // Don't double-feature
        active: false,   // Start hidden until admin reviews the copy
        metaTitle: src.metaTitle,
        metaDesc: src.metaDesc,
        variants: src.variants.length > 0 ? {
          create: src.variants.map(v => ({
            type: v.type,
            name: v.name,
            imageUrl: v.imageUrl,
            sortOrder: v.sortOrder,
          })),
        } : undefined,
      },
    });

    return NextResponse.json({ ok: true, id: created.id, slug: created.slug });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
