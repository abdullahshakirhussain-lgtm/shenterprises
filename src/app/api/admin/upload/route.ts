import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { uploadsSubdir } from "@/lib/paths";
import { isR2Configured, uploadToR2 } from "@/lib/r2";

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
    const contentType: string = (file as any).type || "image/jpeg";
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const buffer = Buffer.from(await (file as any).arrayBuffer());

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
