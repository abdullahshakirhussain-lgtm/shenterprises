import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";
import { getT } from "@/lib/i18n-server";
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
  const t = getT();

  function qs(updates: Partial<SP>) {
    const sp: any = { ...searchParams, ...updates };
    Object.keys(sp).forEach(k => { if (!sp[k]) delete sp[k]; });
    const s = new URLSearchParams(sp).toString();
    return s ? `?${s}` : "";
  }

  // Active-filter badge count — shown on the Filters button so it's obvious when something is on
  const activeFilterCount =
    (sort !== "newest" ? 1 : 0) +
    (!isNaN(min) ? 1 : 0) +
    (!isNaN(max) ? 1 : 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl text-ink">{t("shop_all")}</h1>
          <p className="text-ink-mute text-sm mt-0.5">
            {total} {total === 1 ? t("product") : t("products")}
            {cat ? ` — ${categories.find(c => c.slug === cat)?.name || cat}` : ""}
          </p>
        </div>

        {/* Filters trigger — tucked away in a small button */}
        <details className="relative">
          <summary className="list-none cursor-pointer select-none inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-saffron-300 hover:border-saffron-500 text-ink-soft text-sm font-semibold transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="17" y2="6" />
              <line x1="6" y1="10" x2="14" y2="10" />
              <line x1="9" y1="14" x2="11" y2="14" />
            </svg>
            <span>{t("filter_by")}</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-saffron-500 text-white text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </summary>

          <div className="absolute right-0 top-full mt-2 w-[280px] sm:w-[320px] rounded-xl bg-white border border-saffron-300 shadow-xl z-30 p-4">
            <form action="/shop" method="GET" className="space-y-3">
              {/* Preserve any active category/search context */}
              {cat && <input type="hidden" name="cat" value={cat} />}
              {q && <input type="hidden" name="q" value={q} />}

              <div>
                <label className="label">{t("sort_by")}</label>
                <select name="sort" defaultValue={sort} className="input">
                  <option value="newest">{t("newest_first")}</option>
                  <option value="price-asc">{t("price_low_high")}</option>
                  <option value="price-desc">{t("price_high_low")}</option>
                  <option value="name">{t("name_az")}</option>
                </select>
              </div>
              <div>
                <label className="label">{t("price_range")}</label>
                <div className="flex gap-2">
                  <input name="min" type="number" min="0" defaultValue={searchParams.min || ""} placeholder={t("min_price")} className="input" />
                  <input name="max" type="number" min="0" defaultValue={searchParams.max || ""} placeholder={t("max_price")} className="input" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button className="btn-primary flex-1 text-sm">{t("apply_filters")}</button>
                {activeFilterCount > 0 && (
                  <Link href={`/shop${cat ? `?cat=${cat}` : ""}`} className="btn-secondary text-sm">
                    {t("clear_all")}
                  </Link>
                )}
              </div>
            </form>
          </div>
        </details>
      </div>

      {products.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-brand-700 mb-3">{t("no_products_match")}</p>
          <Link href="/shop" className="btn-secondary">{t("clear_filters")}</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {products.map(p => <ShopProductCard key={p.id} p={p} />)}
          </div>
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
              {page > 1 && (
                <Link href={`/shop${qs({ page: String(page - 1) })}`} className="btn-secondary text-sm">{t("prev")}</Link>
              )}
              <span className="text-sm text-brand-700 px-3">
                {t("page_of")} <strong>{page}</strong> {t("of")} {totalPages}
              </span>
              {page < totalPages && (
                <Link href={`/shop${qs({ page: String(page + 1) })}`} className="btn-secondary text-sm">{t("next")}</Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ShopProductCard({ p }: { p: any }) {
  const baseEffective = p.salePrice ?? p.price;
  const validBase = baseEffective > 0 ? baseEffective : null;
  const variants = p.variants || [];
  const variantPrices = variants
    .map((v: any) => v.salePrice ?? v.price)
    .filter((n: any): n is number => n != null && n > 0);
  const priceCandidates = [...(validBase != null ? [validBase] : []), ...variantPrices];
  const effective = priceCandidates.length > 0 ? Math.min(...priceCandidates) : 0;
  const distinct = new Set(priceCandidates).size;
  const showFrom = distinct > 1;
  const noBaseNoVariants = priceCandidates.length === 0;
  const unitLabel = p.unitQty && p.unitType ? `${p.unitQty} ${p.unitType}` : null;
  const sizes = variants.filter((v: any) => v.type === "size");
  const lengths = variants.filter((v: any) => v.type === "length");
  const colors = variants.filter((v: any) => v.type === "color");
  const packs = variants.filter((v: any) => v.type === "pack");

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
        {(sizes.length > 0 || lengths.length > 0 || packs.length > 0 || colors.length > 1) && (
          <div className="text-[11px] mt-1 space-y-0.5">
            {sizes.length > 0 && <ShopPills label="Sizes" items={sizes.map((v: any) => v.name)} />}
            {lengths.length > 0 && <ShopPills label="Lengths" items={lengths.map((v: any) => v.name)} />}
            {packs.length > 0 && <ShopPills label="Packs" items={packs.map((v: any) => v.name)} />}
            {colors.length > 1 && <div className="text-muted">{colors.length} colors</div>}
          </div>
        )}
        <p className="mt-auto pt-2 flex items-baseline gap-2">
          {noBaseNoVariants ? (
            <span className="text-sm text-muted">See options</span>
          ) : (
            <>
              {showFrom && <span className="text-xs text-muted">From</span>}
              <span className="font-serif font-bold text-brand-700 text-lg">{formatLKR(effective)}</span>
              {!showFrom && validBase != null && p.salePrice && (
                <span className="text-muted text-sm line-through">{formatLKR(p.price)}</span>
              )}
            </>
          )}
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
