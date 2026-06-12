import path from "path";

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
    // Handle absolute URLs by extracting just the pathname
    if (urlPath.startsWith("http")) urlPath = new URL(urlPath).pathname;
  } catch {}
  // Strip leading slash and "uploads/" prefix — uploadsDir() already points at the uploads root
  const relative = urlPath.replace(/^\/+/, "").replace(/^uploads\/?/, "");
  return path.join(uploadsDir(), relative);
}
