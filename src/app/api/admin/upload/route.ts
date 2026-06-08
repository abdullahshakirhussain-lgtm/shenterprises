import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { uploadsSubdir } from "@/lib/paths";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    // Don't use `instanceof File` — that global isn't always available in the runtime.
    // FormDataEntryValue is either a string or a Blob/File-like; check via duck typing.
    if (!file || typeof file === "string" || typeof (file as any).arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    const size: number = (file as any).size ?? 0;
    if (size > 5 * 1024 * 1024) return NextResponse.json({ error: "Image too large (max 5MB)" }, { status: 400 });
    const filename: string = (file as any).name ?? "upload.jpg";
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const dir = uploadsSubdir("products");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), Buffer.from(await (file as any).arrayBuffer()));
    return NextResponse.json({ url: `/uploads/products/${name}` });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
