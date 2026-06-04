import { prisma } from "@/lib/prisma";
import Link from "next/link";
import BulkProductsTable from "./BulkProductsTable";

export const dynamic = "force-dynamic";

export default async function AdminProducts({ searchParams }: { searchParams: { q?: string; cat?: string } }) {
  const q = (searchParams.q || "").trim();
  const cat = (searchParams.cat || "").trim();

  const where: any = {};
  if (q) where.OR = [{ name: { contains: q } }, { sku: { contains: q } }];
  if (cat) where.category = { slug: cat };

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="container-x py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl text-brand-900">Products ({products.length})</h1>
        <div className="flex gap-2">
          <Link href="/admin/import" className="btn-secondary">Import CSV</Link>
          <Link href="/admin/products/new" className="btn-primary">+ New product</Link>
        </div>
      </div>

      <form className="mb-4 flex gap-2 flex-wrap items-end">
        <div>
          <label className="label text-xs">Search</label>
          <input name="q" defaultValue={q} placeholder="Name or SKU…" className="input w-64" />
        </div>
        <div>
          <label className="label text-xs">Category</label>
          <select name="cat" defaultValue={cat} className="input w-56">
            <option value="">All categories</option>
            {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn-secondary">Filter</button>
        {(q || cat) && <Link href="/admin/products" className="text-sm text-brand-700 underline self-center">Clear</Link>}
      </form>

      <BulkProductsTable
        products={products.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          price: p.price,
          salePrice: p.salePrice,
          stock: p.stock,
          active: p.active,
          onOffer: p.onOffer,
          featured: p.featured,
          category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
        }))}
        categories={categories.map(c => ({ id: c.id, name: c.name, slug: c.slug }))}
        currentCategorySlug={cat}
      />
    </div>
  );
}
