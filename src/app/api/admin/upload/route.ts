import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { uploadsSubdir } from "@/lib/paths";
import { isR2Configured, uploadToR2 } from "@/lib/r2";

// Raster formats we can safely downscale + re-encode to WebP. SVG/GIF/PDF are
// left untouched (vectors/animations/documents).
const COMPRESSIBLE = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif", "bmp", "tiff"]);

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string" || typeof (file as any).arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    const size: number = (file as any).size ?? 0;
    if (size > 5 * 1024 * 1024) return NextResponse.json({ error: "Image too large (max 5MB)" }, { status: 400 });

    const origName: string = (file as any).name ?? "upload.jpg";
    const ext = origName.split(".").pop()?.toLowerCase() || "jpg";
    const origBuffer = Buffer.from(await (file as any).arrayBuffer());

    // Downscale + re-encode to WebP so we never store/serve multi-MB originals.
    // Best-effort: if sharp can't handle it (e.g. exotic format), keep original.
    const stem = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    let buffer = origBuffer;
    let name = `${stem}.${ext}`;
    let contentType: string = (file as any).type || "image/jpeg";
    if (COMPRESSIBLE.has(ext)) {
      try {
        buffer = await sharp(origBuffer)
          .rotate() // respect EXIF orientation before stripping metadata
          .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        name = `${stem}.webp`;
        contentType = "image/webp";
      } catch {
        buffer = origBuffer; name = `${stem}.${ext}`; // fall back to the original bytes
      }
    }

    // R2 path — durable, CDN-served, never lost
    if (isR2Configured()) {
      const url = await uploadToR2(`products/${name}`, buffer, contentType);
      return NextResponse.json({ url });
    }

    // Local disk fallback (dev mode)
    const dir = uploadsSubdir("products");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buffer);
    return NextResponse.json({ url: `/uploads/products/${name}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
