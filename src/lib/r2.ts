// Cloudflare R2 (S3-compatible) storage helper.
// When env vars are set, all uploaded images live in R2 (durable, CDN-served).
// When unset, falls back to local disk (dev mode).
//
// Environment variables required for R2:
//   R2_ENDPOINT          e.g. https://abc123...r2.cloudflarestorage.com
//   R2_ACCESS_KEY_ID
//   R2_SECRET_ACCESS_KEY
//   R2_BUCKET            e.g. shenterprises-images
//   R2_PUBLIC_URL        e.g. https://pub-xxx.r2.dev   (no trailing slash)

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET &&
    process.env.R2_PUBLIC_URL
  );
}

let _client: S3Client | null = null;
function client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

function publicBase(): string {
  return (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
}

/** Upload bytes to R2 and return the public URL. */
export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  await client().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return `${publicBase()}/${key}`;
}

/** Download bytes from R2. */
export async function downloadFromR2(key: string): Promise<Buffer> {
  const res = await client().send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
  }));
  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as any) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/** Delete an object from R2. Best-effort — won't throw if missing. */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    await client().send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
    }));
  } catch { /* swallow */ }
}

/** If an image URL points at our R2 bucket, return the object key. Otherwise null. */
export function r2KeyFromUrl(imageUrl: string): string | null {
  const base = publicBase();
  if (!base) return null;
  if (imageUrl.startsWith(base + "/")) {
    return imageUrl.slice(base.length + 1);
  }
  return null;
}
