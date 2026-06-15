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
    if (size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    const type: string = (file as any).type ?? "";
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(type)) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });

    const filename: string = (file as any).name ?? "slip.bin";
    const ext = filename.split(".").pop()?.toLowerCase() || "bin";
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const buf = Buffer.from(await (file as any).arrayBuffer());

    if (isR2Configured()) {
      const url = await uploadToR2(`slips/${name}`, buf, type);
      return NextResponse.json({ url });
    }

    const dir = uploadsSubdir("slips");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buf);
    return NextResponse.json({ url: `/uploads/slips/${name}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
