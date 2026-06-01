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
