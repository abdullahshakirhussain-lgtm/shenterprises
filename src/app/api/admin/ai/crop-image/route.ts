import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { imageUrl, x, y, width, height } = await req.json();
  if (!imageUrl || x == null || y == null || width == null || height == null) {
    return NextResponse.json({ error: "imageUrl, x, y, width, height required" }, { status: 400 });
  }

  try {
    // Fetch or read the source image
    let imageBuffer: Buffer;
    if (imageUrl.startsWith("http")) {
      const res = await fetch(imageUrl);
      imageBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      // Local file path (e.g. /uploads/...)
      const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public");
      const filePath = path.join(uploadDir, imageUrl.replace(/^\//, ""));
      imageBuffer = fs.readFileSync(filePath);
    }

    const img = sharp(imageBuffer);
    const meta = await img.metadata();
    const imgW = meta.width || 800;
    const imgH = meta.height || 800;

    // Convert percentage-based crop to pixels
    const left = Math.round((x / 100) * imgW);
    const top = Math.round((y / 100) * imgH);
    const cropW = Math.round((width / 100) * imgW);
    const cropH = Math.round((height / 100) * imgH);

    const cropped = await sharp(imageBuffer)
      .extract({ left, top, width: Math.max(cropW, 1), height: Math.max(cropH, 1) })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Save cropped image
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filename = `variant-${randomUUID()}.jpg`;
    const outPath = path.join(uploadDir, filename);
    fs.writeFileSync(outPath, cropped);

    const publicUrl = `/uploads/${filename}`;
    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
