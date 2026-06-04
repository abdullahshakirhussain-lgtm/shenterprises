import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q || "").trim();
  const items = q
    ? await prisma.product.findMany({
        where: {
          active: true,
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
            { sku: { contains: q } }
          ]
        },
        take: 60,
        include: { variants: true }
      })
    : [];
  return (
    <div className="container-x py-8">
      <h1 className="font-display text-3xl text-brand-900 mb-2">Search</h1>
      <p className="text-brand-700 mb-6">
        {q ? <>Results for <strong>“{q}”</strong> — {items.length} found</> : "Type a query in the search bar."}
      </p>
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
