import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { uploadsDir } from "@/lib/paths";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

async function fileExists(diskPath: string): Promise<boolean> {
  try { await fs.access(diskPath); return true; } catch { return false; }
}

function urlToDiskPath(url: string): string {
  let urlPath = url;
  try { if (urlPath.startsWith("http")) urlPath = new URL(urlPath).pathname; } catch {}
  const relative = urlPath.replace(/^\/+/, "").replace(/^uploads\/?/, "");
  return path.join(uploadsDir(), relative);
}

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Products with images
  const products = await prisma.product.findMany({
    where: { imageUrl: { not: null } },
    select: {
      id: true, name: true, slug: true, imageUrl: true,
      category: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });
  const missingProducts: any[] = [];
  for (const p of products) {
    if (p.imageUrl && !await fileExists(urlToDiskPath(p.imageUrl))) {
      missingProducts.push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        imageUrl: p.imageUrl,
        category: p.category?.name || null,
      });
    }
  }

  // Variants with images
  const variants = await prisma.productVariant.findMany({
    where: { imageUrl: { not: null } },
    select: {
      id: true, name: true, imageUrl: true, productId: true,
      product: { select: { name: true, slug: true } },
    },
    orderBy: { name: "asc" },
  });
  const missingVariants: any[] = [];
  for (const v of variants) {
    if (v.imageUrl && !await fileExists(urlToDiskPath(v.imageUrl))) {
      missingVariants.push({
        id: v.id,
        name: v.name,
        imageUrl: v.imageUrl,
        productId: v.productId,
        productName: v.product?.name,
        productSlug: v.product?.slug,
      });
    }
  }

  return NextResponse.json({
    productsTotal: products.length,
    productsMissing: missingProducts.length,
    variantsTotal: variants.length,
    variantsMissing: missingVariants.length,
    missingProducts,
    missingVariants,
  }, { headers: { "Cache-Control": "no-store" } });
}
