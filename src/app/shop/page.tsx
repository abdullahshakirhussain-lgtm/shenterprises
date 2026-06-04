import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop all products" };

type SP = { q?: string; cat?: string; sort?: string; min?: string; max?: string; page?: string };

const PAGE_SIZE = 24;

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const q = (searchParams.q || "").trim();
  const cat = (searchParams.cat || "").trim();
  const sort = (searchParams.sort || "newest").trim();
  const min = parseFloat(searchParams.min || "");
  const max = parseFloat(searchParams.max || "");
  const page = Math.max(1, parseInt(searchParams.page || "1"));

  const where: any = { active: true };
  if (q) where.OR = [
    { name: { contains: q, mode: "insensitive" } },
    { description: { contains: q, mode: "insensitive" } },
    { sku: { contains: q, mode: "insensitive" } },
  ];
  if (cat) where.category = { slug: cat };
  if (!isNaN(min) || !isNaN(max)) {
    where.price = {};
    if (!isNaN(min)) where.price.gte = min;
    if (!isNaN(max)) where.price.lte = max;
  }

  let orderBy: any = { createdAt: "desc" };
  if (sort === "price-asc") orderBy = { price: "asc" };
  if (sort === "price-desc") orderBy = { price: "desc" };
  if (sort === "name") orderBy = { name: "asc" };

  const [categories, total, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { variants: true } })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function qs(updates: Partial<SP>) {
    const sp: any = { ...searchParams, ...updates };
    Object.keys(sp).forEach(k => { if (!sp[k]) delete sp[k]; });
    const s = new URLSearchParams(sp).toString();
    return s ? `?${s}` : "";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-serif font-bold text-3xl text-ink mb-2">Shop all products</h1>
      <p className="text-muted text-sm mb-6">
        {total} {total === 1 ? "product" : "products"}
        {cat ? ` in ${categories.find(c => c.slug === cat)?.name || cat}` : ""}
        {q ? ` matching "${q}"` : ""}
      </p>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        <aside className="card p-5 h-fit lg:sticky lg:top-24 space-y-5">
          <form action="/shop" method="GET" className="space-y-4">
            <div>
              <label className="label">Search</label>
              <input name="q" defaultValue={q} className="input" placeholder="Search…" />
            </div>
            <div>
              <label className="label">Category</label>
              <select name="cat" defaultValue={cat} className="input">
                <option value="">All categories</option>
                {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sort by</label>
              <select name="sort" defaultValue={sort} className="input">
                <option value="newest">Newest first</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="name">Name (A–Z)</option>
              </select>
            </div>
            <div>
              <label className="label">Price range (LKR)</label>
              <div className="flex gap-2">
                <input name="min" type="number" min="0" defaultValue={searchParams.min || ""} placeholder="Min" className="input" />
                <input name="max" type="number" min="0" defaultValue={searchParams.max || ""} placeholder="Max" className="input" />
              </div>
            </div>
            <button className="btn-primary w-full">Apply filters</button>
            {(q || cat || sort !== "newest" || searchParams.min || searchParams.max) && (
              <Link href="/shop" className="block text-center text-sm text-brand-700 underline">Clear all</Link>
            )}
          </form>
        </aside>

        <div>
          {products.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-brand-700 mb-3">No products match these filters.</p>
              <Link href="/shop" className="btn-secondary">Clear filters</Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
                {products.map(p => <ShopProductCard key={p.id} p={p} />)}
              </div>
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
                  {page > 1 && (
                    <Link href={`/shop${qs({ page: String(page - 1) })}`} className="btn-secondary text-sm">← Prev</Link>
                  )}
                  <span className="text-sm text-brand-700 px-3">
                    Page <strong>{page}</strong> of {totalPages}
                  </span>
                  {page < totalPages && (
                    <Link href={`/shop${qs({ page: String(page + 1) })}`} className="btn-secondary text-sm">Next →</Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ShopProductCard({ p }: { p: any }) {
  const baseEffective = p.salePrice ?? p.price;
  const variants = p.variants || [];
  const variantPrices = variants
    .map((v: any) => v.salePrice ?? v.price)
    .filter((n: any): n is number => n != null);
  const hasVariantPricing = variantPrices.length > 0;
  const effective = hasVariantPricing ? Math.min(baseEffective, ...variantPrices) : baseEffective;
  const showFrom = hasVariantPricing && variantPrices.some((pr: number) => pr !== baseEffective);
  const unitLabel = p.unitQty && p.unitType ? `${p.unitQty} ${p.unitType}` : null;
  const sizes = variants.filter((v: any) => v.type === "size");
  const lengths = variants.filter((v: any) => v.type === "length");
  const colors = variants.filter((v: any) => v.type === "color");

  return (
    <Link href={`/product/${p.slug}`} className="tile flex flex-col rounded-2xl bg-white border border-brand-100 hover:border-brand-300 shadow-sm overflow-hidden">
      <div className="relative grid place-items-center aspect-square bg-brand-50 text-6xl overflow-hidden">
        {p.onOffer && p.salePrice && (
          <span className="absolute top-2 left-2 rounded-full bg-brand-600 text-white text-[11px] font-bold px-2.5 py-1 z-10">SALE</span>
        )}
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <span>🧵</span>
        )}
      </div>
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-sm sm:text-base leading-snug text-balance line-clamp-2">
          {p.name}
          {unitLabel && lengths.length === 0 && <span className="text-muted"> — {unitLabel}</span>}
        </h3>
        {(sizes.length > 0 || lengths.length > 0 || colors.length > 1) && (
          <div className="text-[11px] mt-1 space-y-0.5">
            {sizes.length > 0 && <ShopPills label="Sizes" items={sizes.map((v: any) => v.name)} />}
            {lengths.length > 0 && <ShopPills label="Lengths" items={lengths.map((v: any) => v.name)} />}
            {colors.length > 1 && <div className="text-muted">{colors.length} colors</div>}
          </div>
        )}
        <p className="mt-auto pt-2 flex items-baseline gap-2">
          {showFrom && <span className="text-xs text-muted">From</span>}
          <span className="font-serif font-bold text-brand-700 text-lg">{formatLKR(effective)}</span>
          {!showFrom && p.salePrice && <span className="text-muted text-sm line-through">{formatLKR(p.price)}</span>}
        </p>
      </div>
    </Link>
  );
}

function ShopPills({ label, items }: { label: string; items: string[] }) {
  const display = items.slice(0, 3);
  const extra = items.length - display.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-muted">{label}:</span>
      {display.map((n, i) => (
        <span key={i} className="inline-block px-1.5 py-0 rounded bg-brand-50 border border-brand-200 text-brand-700">{n}</span>
      ))}
      {extra > 0 && <span className="text-muted">+{extra}</span>}
    </div>
  );
}
