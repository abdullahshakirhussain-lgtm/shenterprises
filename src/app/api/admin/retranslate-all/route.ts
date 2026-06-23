import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { translateToSinhalaAndTamil } from "@/lib/translate";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // give it up to 5 minutes for big catalogs

// Process items in concurrent batches so we don't slam Google Translate or
// exhaust the Supabase pool with parallel updates.
async function batchProcess<T>(items: T[], handler: (item: T) => Promise<boolean>, batchSize = 4) {
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(handler));
    for (const r of results) (r ? ok++ : failed++);
  }
  return { ok, failed };
}

/**
 * POST /api/admin/retranslate-all
 * Refreshes nameSi + nameTa on every Category and ProductVariant by re-running
 * them through the current translate.ts (Google Translate).
 *
 * Body (optional): { onlyMissing?: boolean }
 *   - onlyMissing=true: only touches rows where nameSi or nameTa is null/empty
 *   - default: replaces ALL existing translations
 */
export async function POST(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const onlyMissing = !!body?.onlyMissing;

  // ---- Categories ----
  const categories = await prisma.category.findMany({
    where: onlyMissing
      ? { OR: [{ nameSi: null }, { nameTa: null }, { nameSi: "" }, { nameTa: "" }] }
      : undefined,
    select: { id: true, name: true },
  });
  const catStats = await batchProcess(categories, async (c) => {
    const tr = await translateToSinhalaAndTamil(c.name);
    if (!tr) return false;
    try {
      await prisma.category.update({
        where: { id: c.id },
        data: { nameSi: tr.si, nameTa: tr.ta },
      });
      return true;
    } catch {
      return false;
    }
  });

  // ---- Product variants ----
  const variants = await prisma.productVariant.findMany({
    where: onlyMissing
      ? { OR: [{ nameSi: null }, { nameTa: null }, { nameSi: "" }, { nameTa: "" }] }
      : undefined,
    select: { id: true, name: true },
  });
  const varStats = await batchProcess(variants, async (v) => {
    const tr = await translateToSinhalaAndTamil(v.name);
    if (!tr) return false;
    try {
      await prisma.productVariant.update({
        where: { id: v.id },
        data: { nameSi: tr.si, nameTa: tr.ta },
      });
      return true;
    } catch {
      return false;
    }
  });

  return NextResponse.json({
    ok: true,
    mode: onlyMissing ? "missing-only" : "full-refresh",
    categories: { total: categories.length, ...catStats },
    variants: { total: variants.length, ...varStats },
  });
}

/**
 * GET — quick status preview (no work performed): how many rows lack
 * translations? Useful for the admin button to show context.
 */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [catTotal, catMissing, varTotal, varMissing] = await Promise.all([
    prisma.category.count(),
    prisma.category.count({ where: { OR: [{ nameSi: null }, { nameTa: null }, { nameSi: "" }, { nameTa: "" }] } }),
    prisma.productVariant.count(),
    prisma.productVariant.count({ where: { OR: [{ nameSi: null }, { nameTa: null }, { nameSi: "" }, { nameTa: "" }] } }),
  ]);

  return NextResponse.json({
    categories: { total: catTotal, missing: catMissing },
    variants:   { total: varTotal, missing: varMissing },
  });
}
