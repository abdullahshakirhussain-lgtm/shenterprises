import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { uploadsDir } from "@/lib/paths";
import { prisma } from "@/lib/prisma";
import { isR2Configured, r2KeyFromUrl } from "@/lib/r2";
import fs from "fs/promises";
import path from "path";
import { statfs } from "fs";

export const dynamic = "force-dynamic";

function statfsP(p: string) {
  return new Promise<any>((resolve, reject) => {
    statfs(p, (err, stats) => err ? reject(err) : resolve(stats));
  });
}

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result: any = {
    uploadDirEnv: process.env.UPLOAD_DIR || "(not set)",
    resolvedUploadsDir: uploadsDir(),
  };

  // 1. Check the uploads dir
  try {
    const baseStat = await fs.stat(uploadsDir());
    result.uploadsDirExists = baseStat.isDirectory();
  } catch (e: any) {
    result.uploadsDirExists = false;
    result.uploadsDirError = e.message;
  }

  // 2. Check the products subdir + count files
  const productsDir = path.join(uploadsDir(), "products");
  result.productsDir = productsDir;
  try {
    const entries = await fs.readdir(productsDir);
    result.productsFileCount = entries.length;
    result.productsFirstFew = entries.slice(0, 10);
    result.productsLastFew = entries.slice(-10);
  } catch (e: any) {
    result.productsFileCount = 0;
    result.productsDirError = e.message;
  }

  // 3. Disk space stats
  try {
    const stats = await statfsP(uploadsDir());
    const totalBytes = stats.blocks * stats.bsize;
    const freeBytes = stats.bavail * stats.bsize;
    const usedBytes = totalBytes - freeBytes;
    result.diskTotalMB = Math.round(totalBytes / 1024 / 1024);
    result.diskFreeMB = Math.round(freeBytes / 1024 / 1024);
    result.diskUsedMB = Math.round(usedBytes / 1024 / 1024);
    result.diskUsedPercent = Math.round((usedBytes / totalBytes) * 100);
  } catch (e: any) {
    result.diskError = e.message;
  }

  // 4. Cross-check: how many products in DB reference an imageUrl, and how many of those files actually exist
  try {
    const products = await prisma.product.findMany({
      where: { imageUrl: { not: null } },
      select: { id: true, name: true, imageUrl: true },
    });
    let presentCount = 0;
    const missing: { id: number; name: string; imageUrl: string }[] = [];
    for (const p of products) {
      if (!p.imageUrl) continue;
      // R2 URL? Trust it exists (R2 is durable, we control uploads)
      if (isR2Configured() && r2KeyFromUrl(p.imageUrl) !== null) { presentCount++; continue; }
      // Local: check disk
      let urlPath = p.imageUrl;
      try { if (urlPath.startsWith("http")) urlPath = new URL(urlPath).pathname; } catch {}
      const relative = urlPath.replace(/^\/+/, "").replace(/^uploads\/?/, "");
      const diskPath = path.join(uploadsDir(), relative);
      try {
        await fs.access(diskPath);
        presentCount++;
      } catch {
        missing.push({ id: p.id, name: p.name, imageUrl: p.imageUrl });
      }
    }
    result.productsWithImages = products.length;
    result.productImagesPresent = presentCount;
    result.productImagesMissing = missing.length;
    result.missingExamples = missing.slice(0, 20); // first 20 broken
  } catch (e: any) {
    result.dbCheckError = e.message;
  }

  // 5. Variant images
  try {
    const variants = await prisma.productVariant.findMany({
      where: { imageUrl: { not: null } },
      select: { id: true, name: true, imageUrl: true, productId: true },
    });
    let presentCount = 0;
    const missing: any[] = [];
    for (const v of variants) {
      if (!v.imageUrl) continue;
      if (isR2Configured() && r2KeyFromUrl(v.imageUrl) !== null) { presentCount++; continue; }
      let urlPath = v.imageUrl;
      try { if (urlPath.startsWith("http")) urlPath = new URL(urlPath).pathname; } catch {}
      const relative = urlPath.replace(/^\/+/, "").replace(/^uploads\/?/, "");
      const diskPath = path.join(uploadsDir(), relative);
      try {
        await fs.access(diskPath);
        presentCount++;
      } catch {
        missing.push({ id: v.id, name: v.name, imageUrl: v.imageUrl, productId: v.productId });
      }
    }
    result.variantsWithImages = variants.length;
    result.variantImagesPresent = presentCount;
    result.variantImagesMissing = missing.length;
  } catch (e: any) {
    result.variantCheckError = e.message;
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
