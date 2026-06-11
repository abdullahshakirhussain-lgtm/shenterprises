import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import { smartSearch } from "@/lib/search";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q || "").trim();
  const slim = q ? await smartSearch(q, 60) : [];

  // Hydrate with variants for the card pills (smartSearch returns slim records)
  const items = slim.length
    ? await prisma.product.findMany({
        where: { id: { in: slim.map(p => p.id) } },
        include: { variants: true },
      }).then(rows => {
        // Preserve smartSearch ordering
        const byId = new Map(rows.map(r => [r.id, r]));
        return slim.map(s => byId.get(s.id)).filter(Boolean) as any[];
      })
    : [];

  return (
    <div className="container-x py-8">
      <h1 className="font-display text-3xl text-brand-900 mb-2">Search</h1>
      <p className="text-brand-700 mb-6">
        {q ? <>Results for <strong>“{q}”</strong> — {items.length} found</> : "Type a query in the search bar."}
      </p>
      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      ) : q ? (
        <p className="text-brand-500 italic">
          No products matched. Try fewer or different keywords — e.g. just the product type ("zipper", "elastic").
        </p>
      ) : null}
    </div>
  );
}
