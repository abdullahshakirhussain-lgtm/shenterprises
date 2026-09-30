import { readBody } from "@/lib/requestBody";
import { persistentRateLimit } from "@/lib/persistentRateLimit";
import { prisma } from "@/lib/prisma";
import { getOrCreateSessionId } from "@/lib/analytics";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { uploadsSubdir } from "@/lib/paths";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { rateLimit, clientIp } from "@/lib/rateLimit";

// Map the validated content-type to a safe extension — never trust the client filename
const TYPE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function POST(req: NextRequest) {
  try {
    if (!(await persistentRateLimit("slip:" + clientIp(req), 10, 600)).ok) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    // Public endpoint — throttle to 10 uploads per IP per 10 minutes
    const rl = rateLimit(`upload-slip:${clientIp(req)}`, 10, 600);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many uploads. Please wait a few minutes." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const bytes = await readBody(req, 10 * 1024 * 1024 + 65536);
    const form = await new Request(req.url, { method: "POST", headers: req.headers, body: new Uint8Array(bytes) }).formData();
    const file = form.get("file");
    if (!file || typeof file === "string" || typeof (file as any).arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    const size: number = (file as any).size ?? 0;
    if (size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    const type: string = (file as any).type ?? "";
    if (!TYPE_EXT[type]) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });

    // Extension derived from the validated content-type, NOT the client filename
    const ext = TYPE_EXT[type];
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const buf = Buffer.from(await (file as any).arrayBuffer());

    const signatureOk = type === "application/pdf" ? buf.subarray(0, 5).toString() === "%PDF-" :
      type === "image/png" ? buf.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) :
      type === "image/jpeg" ? buf[0] === 255 && buf[1] === 216 && buf[2] === 255 :
      buf.subarray(0,4).toString() === "RIFF" && buf.subarray(8,12).toString() === "WEBP";
    if (!signatureOk) return NextResponse.json({ error: "File contents do not match the selected format." }, { status: 400 });
    const id = crypto.randomUUID();
    await prisma.bankSlip.create({ data: { id, sessionId: (await getOrCreateSessionId()), contentType: type, body: buf } });
    return NextResponse.json({ url: "/api/slips/" + id + "." + ext });
  } catch (e: any) {
    return NextResponse.json({ error: "Unable to upload the slip. Please try again." }, { status: 500 });
  }
}
