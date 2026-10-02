import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { memo } from "@/lib/memo";
import ProductCard from "@/components/ProductCard";
import { notFound } from "next/navigation";
import { getT, getServerLang } from "@/lib/i18n-server";
import { localizedName } from "@/lib/display";
import type { Metadata } from "next";
import { langAlternates } from "@/lib/seoLang";
import JsonLd, { breadcrumbSchema } from "@/components/JsonLd";
import { CATEGORY_CONTENT } from "@/content/categoryContent";
import { listingPrice } from "@/lib/commerce";
import { formatLKR } from "@/lib/utils";

export const dynamic = "force-dynamic";

// One cached load shared by generateMetadata and the page (see lib/memo.ts).
function loadCategory(slug: string) {
  return memo("category:" + slug, () => prisma.category.findUnique({
    where: { slug },
    include: { products: { where: { active: true }, orderBy: { createdAt: "desc" }, include: { variants: true } } }
  }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const cat = await loadCategory(params.slug);
  if (!cat) return { title: "Category not found" };
  return {
    title: `${localizedName(cat as any, await getServerLang())} — Buy ${cat.name} Online in Sri Lanka`,
    description: CATEGORY_CONTENT[cat.slug]?.meta || `Shop ${cat.name.toLowerCase()} at SH Enterprises. Island-wide delivery in Sri Lanka with cash on delivery available.`,
    alternates: await langAlternates(`/category/${cat.slug}`)
  };
}

export default async function CategoryPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const cat = await loadCategory(params.slug);
  if (!cat) notFound();

  const t = await getT();
  const lang = await getServerLang();
  const displayName = localizedName(cat as any, lang);
  const content = CATEGORY_CONTENT[cat.slug];
  const siteUrl = process.env.SITE_URL || "https://shenterprises.lk";
  // Live "from" price for the intro line (never hard-coded in the copy).
  const prices = cat.products.map(p => listingPrice(p)).filter(q => q.available && q.min > 0).map(q => q.min);
  const fromPrice = prices.length ? Math.min(...prices) : null;
  const allCats = content ? await memo("categories", () => prisma.category.findMany({ orderBy: { sortOrder: "asc" } })) : [];
  const related = content ? content.related.map(s => allCats.find(c => c.slug === s)).filter(Boolean) as typeof allCats : [];

  return (
    <div className="container-x py-8">
      <nav className="text-sm text-brand-700 mb-2">
        <Link href="/">{t("breadcrumb_home")}</Link> / <span>{displayName}</span>
      </nav>
      <JsonLd data={breadcrumbSchema(siteUrl, [{ name: "Home", url: "/" }, { name: cat.name, url: `/category/${cat.slug}` }])} />
      {content && content.faq.length > 0 && (
        <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: content.faq.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      )}
      <h1 className="font-display text-3xl text-brand-900">{displayName}</h1>
      {content && <p className="text-ink-soft mt-2 max-w-2xl">{content.lead}</p>}
      <p className="text-sm text-ink-mute mt-1 mb-6">
        {cat.products.length} product{cat.products.length === 1 ? "" : "s"}{fromPrice != null && <> · from {formatLKR(fromPrice)}</>} · island-wide cash on delivery
      </p>
      {cat.products.length === 0 ? (
        <p className="text-brand-700">{t("no_products_match")}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {cat.products.map((p, i) => <ProductCard key={p.id} p={p as any} priority={i < 4} />)}
        </div>
      )}

      {/* Buying guide + FAQ below the products: useful to shoppers, and gives Google
          real text to rank the page for searches like "zippers Sri Lanka". */}
      {content && (
        <section className="mt-14 grid md:grid-cols-[1.4fr_1fr] gap-10">
          <div>
            <h2 className="font-display text-2xl text-brand-900 mb-3">Choosing {cat.name.toLowerCase()}</h2>
            <div className="space-y-3 text-ink-soft leading-relaxed">
              {content.guide.map((para, i) => <p key={i}>{para}</p>)}
            </div>
            {related.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-[.18em] text-ink-mute mb-2">Related categories</p>
                <div className="flex flex-wrap gap-2">
                  {related.map(c => (
                    <Link key={c.slug} href={`/category/${c.slug}`} className="min-h-[40px] inline-flex items-center px-4 rounded-full border border-saffron-300 bg-white text-sm font-semibold text-ink-soft hover:border-saffron-500">{localizedName(c as any, lang)}</Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          {content.faq.length > 0 && (
            <div>
              <h2 className="font-display text-2xl text-brand-900 mb-3">Questions</h2>
              <div className="divide-y divide-brand-100 border-y border-brand-100">
                {content.faq.map((f, i) => (
                  <details key={i} className="group py-3">
                    <summary className="cursor-pointer list-none flex justify-between gap-3 font-semibold text-ink">
                      {f.q}<span className="text-saffron-600 group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <p className="mt-2 text-sm text-ink-soft leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
