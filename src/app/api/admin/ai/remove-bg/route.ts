import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { uploadsSubdir, resolveUploadPath } from "@/lib/paths";

/**
 * Crops an image (optional) and/or removes its background.
 * Body: { imageUrl, crop?: {x, y, width, height} (% based), removeBg?: boolean }
 * Returns: { url } — new image URL
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { imageUrl, crop, removeBg } = await req.json();
  if (!imageUrl) return NextResponse.json({ error: "imageUrl required" }, { status: 400 });

  try {
    // 1. Load source image
    let imageBuffer: Buffer;
    const isLocalUpload = imageUrl.startsWith("/uploads/")
      || (imageUrl.startsWith("http") && imageUrl.includes("/uploads/"));
    if (isLocalUpload) {
      imageBuffer = fs.readFileSync(resolveUploadPath(imageUrl));
    } else if (imageUrl.startsWith("http")) {
      const res = await fetch(imageUrl);
      imageBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      imageBuffer = fs.readFileSync(resolveUploadPath(imageUrl));
    }

    // 2. Crop if requested
    if (crop && typeof crop.x === "number") {
      const meta = await sharp(imageBuffer).metadata();
      const imgW = meta.width || 800;
      const imgH = meta.height || 800;
      const left = Math.round((crop.x / 100) * imgW);
      const top = Math.round((crop.y / 100) * imgH);
      const cw = Math.round((crop.width / 100) * imgW);
      const ch = Math.round((crop.height / 100) * imgH);
      imageBuffer = await sharp(imageBuffer)
        .extract({ left: Math.max(0, left), top: Math.max(0, top), width: Math.max(1, cw), height: Math.max(1, ch) })
        .toBuffer();
    }

    // 3. Remove background if requested
    let outputExt = "jpg";
    if (removeBg) {
      const apiKey = process.env.REMOVEBG_API_KEY;
      if (!apiKey) {
        return NextResponse.json({
          error: "Background removal not configured. Add REMOVEBG_API_KEY to your .env file. Get a free key at remove.bg (50 free/month)."
        }, { status: 400 });
      }

      const fd = new FormData();
      fd.append("size", "auto");
      fd.append("image_file", new Blob([new Uint8Array(imageBuffer)]));

      const res = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": apiKey },
        body: fd,
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: `Background removal failed: ${errText.slice(0, 200)}` }, { status: res.status });
      }

      imageBuffer = Buffer.from(await res.arrayBuffer());
      outputExt = "png";
    } else {
      imageBuffer = await sharp(imageBuffer).jpeg({ quality: 92 }).toBuffer();
    }

    // 4. Save output — always into the products subdir
    const outDir = uploadsSubdir("products");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const filename = `edited-${Date.now()}-${randomUUID().slice(0, 8)}.${outputExt}`;
    fs.writeFileSync(path.join(outDir, filename), imageBuffer);

    return NextResponse.json({ url: `/uploads/products/${filename}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
