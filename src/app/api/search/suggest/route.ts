import { NextRequest, NextResponse } from "next/server";
import { smartSearch } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  try {
    const results = await smartSearch(q, 6);
    return NextResponse.json({
      results: results.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.salePrice ?? p.price,
        imageUrl: p.imageUrl,
        unitLabel: p.unitQty && p.unitType ? `${p.unitQty} ${p.unitType}` : null,
      }))
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
