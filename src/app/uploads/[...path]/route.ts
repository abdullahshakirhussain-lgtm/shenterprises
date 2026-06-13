// Streams uploaded files from disk.
// In dev (UPLOAD_DIR unset), files live under public/uploads and Next serves them
// statically — this route is never hit. In prod with UPLOAD_DIR set (e.g. Railway
// volume), Next's static handler can't see them so this route reads from disk.

import { NextRequest, NextResponse } from "next/server";
import { stat, readFile } from "fs/promises";
import path from "path";
import { uploadsDir } from "@/lib/paths";

const MIME: Record<string, string> = {
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".webp": "image/webp",
  ".gif":  "image/gif",
  ".avif": "image/avif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".svg":  "image/svg+xml",
  ".bmp":  "image/bmp",
  ".tiff": "image/tiff",
  ".ico":  "image/x-icon",
  ".pdf":  "application/pdf",
};

// IMPORTANT: never let 404s or errors get cached. If we cached a 404 as
// "immutable", browsers and CDNs would refuse to fetch the file again even
// after it becomes available.
function notFound() {
  return new NextResponse("Not found", {
    status: 404,
    headers: {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}

export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // resolve safely inside the uploads dir to prevent traversal
    const base = path.resolve(uploadsDir());
    const target = path.resolve(base, ...params.path);
    if (!target.startsWith(base)) {
      return new NextResponse("Forbidden", {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const s = await stat(target);
    if (!s.isFile()) return notFound();

    const ext = path.extname(target).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    const buf = await readFile(target);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Cache aggressively — files are immutable once written, named with timestamps
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return notFound();
  }
}
