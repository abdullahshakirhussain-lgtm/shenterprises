import path from "path";
import fs from "fs/promises";
import { r2KeyFromUrl, downloadFromR2 } from "./r2";

/**
 * Where uploaded files live on disk.
 * - Dev / no env set → `<cwd>/public/uploads` (Next serves them statically).
 * - Prod (Railway volume) → set `UPLOAD_DIR=/app/data/uploads` and we'll write/read there.
 *   In that case our `/uploads/[...path]` route streams the bytes since they're
 *   no longer under `public/`.
 */
export function uploadsDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
}

export function uploadsSubdir(sub: "products" | "slips"): string {
  return path.join(uploadsDir(), sub);
}

/**
 * Map a public URL like "/uploads/products/foo.jpg" (or http://host/uploads/...)
 * to the actual on-disk path. Handles both local dev and Railway volume.
 */
export function resolveUploadPath(publicUrl: string): string {
  let urlPath = publicUrl;
  try {
    if (urlPath.startsWith("http")) urlPath = new URL(urlPath).pathname;
  } catch {}
  const relative = urlPath.replace(/^\/+/, "").replace(/^uploads\/?/, "");
  return path.join(uploadsDir(), relative);
}

/**
 * Universal image fetcher: handles R2 URLs, local /uploads/ URLs, and remote HTTP URLs.
 * Used by AI / image-editing routes to read the source image regardless of where it lives.
 */
export async function readImageBuffer(imageUrl: string): Promise<Buffer> {
  // 1. R2 URL — read straight from the bucket via S3 API
  const r2Key = r2KeyFromUrl(imageUrl);
  if (r2Key) return await downloadFromR2(r2Key);

  // 2. Local /uploads/... path — read from disk
  let urlPath = imageUrl;
  try { if (urlPath.startsWith("http")) urlPath = new URL(urlPath).pathname; } catch {}
  if (urlPath.startsWith("/uploads/")) {
    return await fs.readFile(resolveUploadPath(urlPath));
  }

  // 3. External HTTP(S) URL — fetch it
  if (imageUrl.startsWith("http")) {
    const res = await fetch(imageUrl);
    return Buffer.from(await res.arrayBuffer());
  }

  // 4. Fallback: try local
  return await fs.readFile(resolveUploadPath(imageUrl));
}
