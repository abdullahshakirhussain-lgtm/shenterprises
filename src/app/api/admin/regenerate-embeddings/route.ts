import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { embed, productEmbeddingText, upsertProductEmbedding, embeddingsAvailable } from "@/lib/embeddings";

export const dynamic = "force-dynamic";

// POST — regenerate embeddings for ALL active products
export async function POST() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ready = await embeddingsAvailable();
  if (!ready) {
    return NextResponse.json({
      error: "Embeddings column not set up. Run this SQL in Supabase first:\nCREATE EXTENSION IF NOT EXISTS vector;\nALTER TABLE \"Product\" ADD COLUMN IF NOT EXISTS embedding vector(1536);"
    }, { status: 412 });
  }

  const products = await prisma.product.findMany({
    where: { active: true },
    select: {
      id: true, name: true, description: true, sku: true,
      category: { select: { name: true } },
      variants: { select: { type: true, name: true } },
    },
  });

  let ok = 0;
  let failed = 0;
  for (const p of products) {
    const text = productEmbeddingText(p);
    const vec = await embed(text);
    if (!vec) { failed++; continue; }
    const success = await upsertProductEmbedding(p.id, vec);
    if (success) ok++; else failed++;
  }

  return NextResponse.json({ total: products.length, embedded: ok, failed });
}

// GET — status check
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ready = await embeddingsAvailable();
  if (!ready) {
    return NextResponse.json({ ready: false, message: "pgvector extension or embedding column not yet set up" });
  }

  try {
    const stats: any[] = await prisma.$queryRawUnsafe(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(embedding)::int AS embedded
       FROM "Product"
       WHERE active = true`
    );
    return NextResponse.json({ ready: true, ...(stats[0] || { total: 0, embedded: 0 }) });
  } catch (e: any) {
    return NextResponse.json({ ready: false, message: e?.message });
  }
}
