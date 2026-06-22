import OpenAI from "openai";
import { prisma } from "./prisma";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensions, very cheap
const EMBEDDING_DIM = 1536;

/**
 * Generate a vector embedding for the given text using OpenAI.
 * Returns null if API isn't configured or the call fails.
 */
export async function embed(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!text || !text.trim()) return null;
  try {
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000), // safety: text-embedding-3-small handles ~8K tokens
    });
    return res.data[0]?.embedding ?? null;
  } catch (e: any) {
    console.warn("[embeddings] embed failed:", e?.message);
    return null;
  }
}

/**
 * Build the canonical text representation of a product for embedding.
 * This text is what the vector "means" — keep it stable so similarity is meaningful.
 */
export function productEmbeddingText(p: {
  name: string;
  description: string | null;
  sku: string | null;
  category?: { name: string } | null;
  variants?: { type: string; name: string }[];
}): string {
  const parts = [
    p.name,
    p.category?.name && `Category: ${p.category.name}`,
    p.sku && `SKU: ${p.sku}`,
    p.description,
    p.variants && p.variants.length > 0
      ? `Variants: ${p.variants.map(v => `${v.type} ${v.name}`).join(", ")}`
      : null,
  ].filter(Boolean);
  return parts.join("\n");
}

/**
 * Persist an embedding for a product. Uses raw SQL because Prisma doesn't natively
 * type the pgvector column. If the column doesn't exist yet, this is a no-op.
 */
export async function upsertProductEmbedding(productId: number, vector: number[]): Promise<boolean> {
  if (!vector || vector.length !== EMBEDDING_DIM) return false;
  try {
    const vecLiteral = `[${vector.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE "Product" SET embedding = $1::vector WHERE id = $2`,
      vecLiteral,
      productId
    );
    return true;
  } catch (e: any) {
    // Column or extension missing — soft fail so the app keeps working
    console.warn("[embeddings] upsert failed (extension/column may be missing):", e?.message);
    return false;
  }
}

/**
 * Find the K most semantically similar products to the query text.
 * Returns [] if embeddings aren't set up yet — callers should fall back to keyword search.
 */
export async function vectorSearchProducts(
  query: string,
  k: number = 20
): Promise<Array<{ id: number; similarity: number }>> {
  const qVec = await embed(query);
  if (!qVec) return [];
  try {
    const vecLiteral = `[${qVec.join(",")}]`;
    // 1 - (embedding <=> query) gives a 0..1 cosine similarity (1 = identical)
    const rows: Array<{ id: number; similarity: number }> = await prisma.$queryRawUnsafe(
      `SELECT id, 1 - (embedding <=> $1::vector) AS similarity
       FROM "Product"
       WHERE active = true AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      vecLiteral,
      k
    );
    return rows.map(r => ({ id: r.id, similarity: Number(r.similarity) }));
  } catch (e: any) {
    console.warn("[embeddings] vector search failed (extension/column may be missing):", e?.message);
    return [];
  }
}

/**
 * Check whether the embeddings infrastructure is set up.
 * Used by admin UI to show the "Generate embeddings" button only when ready.
 */
export async function embeddingsAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRawUnsafe(`SELECT embedding FROM "Product" LIMIT 1`);
    return true;
  } catch (e: any) {
    console.warn("[embeddings] availability check failed:", e?.message);
    return false;
  }
}

/**
 * Diagnostic — returns details about why availability check failed.
 * Used by the admin AI Tools page to surface the actual error.
 */
export async function embeddingsAvailabilityDetail(): Promise<{
  ready: boolean;
  error?: string;
  extensionInstalled?: boolean;
  columnExists?: boolean;
}> {
  // Check extension
  let extensionInstalled = false;
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT 1 FROM pg_extension WHERE extname = 'vector'`
    );
    extensionInstalled = rows.length > 0;
  } catch (e: any) {
    return { ready: false, error: "Cannot query pg_extension: " + e?.message };
  }

  // Check column
  let columnExists = false;
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'Product' AND column_name = 'embedding'`
    );
    columnExists = rows.length > 0;
  } catch (e: any) {
    return {
      ready: false,
      error: "Cannot query columns: " + e?.message,
      extensionInstalled,
    };
  }

  // Final test: actually SELECT it
  try {
    await prisma.$queryRawUnsafe(`SELECT embedding FROM "Product" LIMIT 1`);
    return { ready: true, extensionInstalled, columnExists };
  } catch (e: any) {
    return {
      ready: false,
      error: "SELECT failed: " + e?.message,
      extensionInstalled,
      columnExists,
    };
  }
}
