import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { embed, productEmbeddingText, upsertProductEmbedding, embeddingsAvailable, embeddingsAvailabilityDetail } from "@/lib/embeddings";

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

// GET — status check (now with diagnostic detail + optional sample preview)
export async function GET(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const detail = await embeddingsAvailabilityDetail();
  if (!detail.ready) {
    return NextResponse.json({
      ready: false,
      message: detail.error || "pgvector extension or embedding column not yet set up",
      extensionInstalled: detail.extensionInstalled,
      columnExists: detail.columnExists,
    });
  }

  try {
    const stats: any[] = await prisma.$queryRawUnsafe(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(embedding)::int AS embedded
       FROM "Product"
       WHERE active = true`
    );

    // Optional: return a sample of 5 embedded products with a truncated vector preview
    const includeSample = new URL(req.url).searchParams.get("sample") === "1";
    let sample: Array<{ id: number; name: string; preview: string }> = [];
    if (includeSample) {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT
           id,
           name,
           SUBSTRING(embedding::text, 1, 100) AS preview
         FROM "Product"
         WHERE active = true AND embedding IS NOT NULL
         ORDER BY id
         LIMIT 5`
      );
      sample = rows.map(r => ({ id: r.id, name: r.name, preview: r.preview }));
    }

    return NextResponse.json({ ready: true, ...(stats[0] || { total: 0, embedded: 0 }), sample });
  } catch (e: any) {
    return NextResponse.json({ ready: false, message: e?.message });
  }
}
