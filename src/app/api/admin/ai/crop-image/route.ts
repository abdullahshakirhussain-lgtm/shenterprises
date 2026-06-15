import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { uploadsDir, readImageBuffer } from "@/lib/paths";
import { isR2Configured, uploadToR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { imageUrl, x, y, width, height } = await req.json();
  if (!imageUrl || x == null || y == null || width == null || height == null) {
    return NextResponse.json({ error: "imageUrl, x, y, width, height required" }, { status: 400 });
  }

  try {
    const imageBuffer = await readImageBuffer(imageUrl);

    const img = sharp(imageBuffer);
    const meta = await img.metadata();
    const imgW = meta.width || 800;
    const imgH = meta.height || 800;

    const left = Math.round((x / 100) * imgW);
    const top  = Math.round((y / 100) * imgH);
    const cropW = Math.round((width / 100) * imgW);
    const cropH = Math.round((height / 100) * imgH);

    const cropped = await sharp(imageBuffer)
      .extract({ left, top, width: Math.max(cropW, 1), height: Math.max(cropH, 1) })
      .jpeg({ quality: 90 })
      .toBuffer();

    const filename = `variant-${randomUUID()}.jpg`;

    if (isR2Configured()) {
      const url = await uploadToR2(`products/${filename}`, cropped, "image/jpeg");
      return NextResponse.json({ url });
    }

    const outDir = uploadsDir();
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, filename), cropped);
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
