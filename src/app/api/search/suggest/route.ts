import { listingPrice } from "@/lib/commerce";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";
import { smartSearch, productsByIds } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!rateLimit("search:" + clientIp(req), 90, 60).ok) return NextResponse.json({ results: [] });
  const q = (req.nextUrl.searchParams.get("q") || "").trim().slice(0,100);
  if (q.length < 2) return NextResponse.json({ results: [] });

  try {
    const results = await smartSearch(q, 6);
    if (results.length === 0) return NextResponse.json({ results: [] });

    // Fetch variant prices for these products so we can show the right label
    // when the base price is 0/empty but variants are priced.
    const ids = results.map(r => r.id);
    const products = await productsByIds(ids);
    return NextResponse.json({
      results: results.filter(p => products.some(full => full.id === p.id)).map(p => {
        const full = products.find(full => full.id === p.id)!;
        const quote = listingPrice(full);
        const effective = quote.min;
        const fromPrice = quote.from;
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: effective,
          outOfStock: !quote.available,
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
