import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { uploadsDir } from "@/lib/paths";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
// This can take a while — give it room.
export const maxDuration = 300;

const MIME: Record<string, string> = {
  ".jpg":  "image/jpeg", ".jpeg": "image/jpeg",
  ".png":  "image/png", ".webp": "image/webp", ".gif":  "image/gif",
  ".avif": "image/avif", ".heic": "image/heic", ".heif": "image/heif",
  ".svg":  "image/svg+xml", ".bmp":  "image/bmp", ".pdf":  "application/pdf",
};

async function* walk(dir: string): AsyncGenerator<string> {
  let entries: any[];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile()) yield full;
  }
}

/** Convert "/app/data/uploads/products/foo.jpg" → "products/foo.jpg" (relative to uploads root). */
function relativeKey(diskPath: string): string {
  const base = path.resolve(uploadsDir());
  const rel = path.relative(base, diskPath);
  return rel.split(path.sep).join("/");
}

/** Convert a relative key back into the public URL the DB would have stored. */
function oldPublicUrl(key: string): string {
  return `/uploads/${key}`;
}

export async function POST() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isR2Configured()) return NextResponse.json({ error: "R2 not configured" }, { status: 400 });

  const result = {
    filesFound: 0,
    filesUploaded: 0,
    filesSkipped: 0,
    productsUpdated: 0,
    variantsUpdated: 0,
    bannersUpdated: 0,
    errors: [] as { file: string; error: string }[],
    mappings: [] as { oldUrl: string; newUrl: string }[],
  };

  const base = uploadsDir();

  // 1. Walk the volume and upload every file we find
  for await (const file of walk(base)) {
    result.filesFound++;
    try {
      const key = relativeKey(file);
      const ext = path.extname(file).toLowerCase();
      const contentType = MIME[ext] || "application/octet-stream";
      const buf = await fs.readFile(file);
      const newUrl = await uploadToR2(key, buf, contentType);
      const oldUrl = oldPublicUrl(key);
      result.mappings.push({ oldUrl, newUrl });
      result.filesUploaded++;
    } catch (e: any) {
      result.errors.push({ file, error: e.message });
      result.filesSkipped++;
    }
  }

  // 2. Update DB rows that reference the old URLs
  if (result.mappings.length > 0) {
    const lookup = new Map(result.mappings.map(m => [m.oldUrl, m.newUrl]));

    // Products — main image
    const productsWithImage = await prisma.product.findMany({
      where: { imageUrl: { not: null } },
      select: { id: true, imageUrl: true, images: true },
    });
    for (const p of productsWithImage) {
      let mainUrl = p.imageUrl;
      let imagesJson = p.images;
      let changed = false;

      if (mainUrl && lookup.has(mainUrl)) {
        mainUrl = lookup.get(mainUrl)!;
        changed = true;
      }
      // Also update gallery array
      if (imagesJson) {
        try {
          const arr = JSON.parse(imagesJson);
          if (Array.isArray(arr)) {
            const newArr = arr.map((u: string) => lookup.get(u) || u);
            if (JSON.stringify(newArr) !== imagesJson) {
              imagesJson = JSON.stringify(newArr);
              changed = true;
            }
          }
        } catch {}
      }

      if (changed) {
        await prisma.product.update({ where: { id: p.id }, data: { imageUrl: mainUrl, images: imagesJson } });
        result.productsUpdated++;
      }
    }

    // Variants
    const variants = await prisma.productVariant.findMany({
      where: { imageUrl: { not: null } },
      select: { id: true, imageUrl: true },
    });
    for (const v of variants) {
      if (v.imageUrl && lookup.has(v.imageUrl)) {
        await prisma.productVariant.update({ where: { id: v.id }, data: { imageUrl: lookup.get(v.imageUrl) } });
        result.variantsUpdated++;
      }
    }

    // Banners
    const banners = await prisma.banner.findMany({
      where: { imageUrl: { not: undefined } },
      select: { id: true, imageUrl: true },
    });
    for (const b of banners) {
      if (b.imageUrl && lookup.has(b.imageUrl)) {
        await prisma.banner.update({ where: { id: b.id }, data: { imageUrl: lookup.get(b.imageUrl) } });
        result.bannersUpdated++;
      }
    }
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
