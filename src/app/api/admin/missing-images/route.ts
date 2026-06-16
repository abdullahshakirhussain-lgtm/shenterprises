import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { uploadsDir } from "@/lib/paths";
import { prisma } from "@/lib/prisma";
import { isR2Configured, r2KeyFromUrl } from "@/lib/r2";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

function urlToDiskPath(url: string): string {
  let urlPath = url;
  try { if (urlPath.startsWith("http")) urlPath = new URL(urlPath).pathname; } catch {}
  const relative = urlPath.replace(/^\/+/, "").replace(/^uploads\/?/, "");
  return path.join(uploadsDir(), relative);
}

/**
 * Decide whether an image URL "exists" — i.e. should NOT appear in the missing list.
 *  - R2 URLs: assume present (we control uploads; R2 is durable, files don't vanish)
 *  - Local /uploads/* URLs: check disk
 *  - External http(s) URLs (not ours): assume present (we don't manage them)
 */
async function imageExists(url: string): Promise<boolean> {
  if (!url) return false;

  // R2 — trust the URL
  if (isR2Configured() && r2KeyFromUrl(url) !== null) {
    return true;
  }

  // Local uploads — check disk
  const isLocalUpload = url.startsWith("/uploads/")
    || (url.startsWith("http") && (() => {
      try { return new URL(url).pathname.startsWith("/uploads/"); }
      catch { return false; }
    })());
  if (isLocalUpload) {
    try { await fs.access(urlToDiskPath(url)); return true; }
    catch { return false; }
  }

  // External URL we don't own — assume present
  return true;
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
    if (p.imageUrl && !await imageExists(p.imageUrl)) {
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
    if (v.imageUrl && !await imageExists(v.imageUrl)) {
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
