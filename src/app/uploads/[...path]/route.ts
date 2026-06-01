// Streams uploaded files from disk.
// In dev (UPLOAD_DIR unset), files live under public/uploads and Next serves them
// statically — this route is never hit. In prod with UPLOAD_DIR set (e.g. Railway
// volume), Next's static handler can't see them so this route reads from disk.

import { NextRequest, NextResponse } from "next/server";
import { stat, readFile } from "fs/promises";
import path from "path";
import { uploadsDir } from "@/lib/paths";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".gif": "image/gif", ".pdf": "application/pdf"
};

export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // resolve safely inside the uploads dir to prevent traversal
    const base = path.resolve(uploadsDir());
    const target = path.resolve(base, ...params.path);
    if (!target.startsWith(base)) return new NextResponse("Forbidden", { status: 403 });

    const s = await stat(target);
    if (!s.isFile()) return new NextResponse("Not found", { status: 404 });

    const ext = path.extname(target).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    const buf = await readFile(target);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
