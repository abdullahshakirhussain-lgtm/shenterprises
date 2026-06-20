import { NextRequest, NextResponse } from "next/server";
import { smartSearch } from "@/lib/search";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  try {
    const results = await smartSearch(q, 6);
    if (results.length === 0) return NextResponse.json({ results: [] });

    // Fetch variant prices for these products so we can show the right label
    // when the base price is 0/empty but variants are priced.
    const ids = results.map(r => r.id);
    const variants = await prisma.productVariant.findMany({
      where: { productId: { in: ids } },
      select: { productId: true, price: true, salePrice: true },
    });
    const variantPricesByProduct = new Map<number, number[]>();
    for (const v of variants) {
      const effective = v.salePrice ?? v.price;
      if (effective == null || effective <= 0) continue;
      if (!variantPricesByProduct.has(v.productId)) variantPricesByProduct.set(v.productId, []);
      variantPricesByProduct.get(v.productId)!.push(effective);
    }

    return NextResponse.json({
      results: results.map(p => {
        const basePrice = p.salePrice ?? p.price;
        const validBase = basePrice > 0 ? basePrice : null;
        const vPrices = variantPricesByProduct.get(p.id) || [];
        // Effective = min of (valid base, all variant prices)
        const candidates = [...(validBase != null ? [validBase] : []), ...vPrices];
        const effective = candidates.length > 0 ? Math.min(...candidates) : 0;
        // "From" when multiple distinct prices exist
        const distinct = new Set(candidates).size;
        const fromPrice = distinct > 1;
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: effective,
          fromPrice,
          imageUrl: p.imageUrl,
          unitLabel: p.unitQty && p.unitType ? `${p.unitQty} ${p.unitType}` : null,
        };
      }),
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
