import { prisma } from "@/lib/prisma";
import { memo } from "@/lib/memo";
import { notFound } from "next/navigation";
import { safeJSON, unitLabel as formatUnit } from "@/lib/utils";
import ProductTopSection from "@/components/ProductTopSection";
import ProductCard from "@/components/ProductCard";
import RelatedHeading from "@/components/RelatedHeading";
import ReviewSection from "@/components/ReviewSection";
import JsonLd, { breadcrumbSchema, safeJsonLd, productSchema } from "@/components/JsonLd";
import { getT } from "@/lib/i18n-server";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

// One cached load shared by generateMetadata and the page (see lib/memo.ts).
function loadProduct(slug: string) {
  return memo("product:" + slug, () => prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      reviews: { where: { approved: true }, orderBy: { createdAt: "desc" } },
      variants: { orderBy: [{ type: "asc" }, { sortOrder: "asc" }] }
    }
  }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const p = await loadProduct(params.slug);
  if (!p) return { title: "Product not found" };
  return {
    title: p.metaTitle || p.name,
    description: p.metaDesc || (p.description ?? `Buy ${p.name} online at SH Enterprises. Island-wide delivery in Sri Lanka.`),
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: {
      title: p.name,
      description: p.description || undefined,
      images: p.imageUrl ? [p.imageUrl] : undefined,
      type: "website"
    }
  };
}

export default async function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const p = await loadProduct(params.slug);
  if (!p || !p.active) notFound();

  const related = p.categoryId ? await memo("related:" + p.id, () => prisma.product.findMany({
    where: { categoryId: p.categoryId, active: true, id: { not: p.id } },
    orderBy: { createdAt: "desc" },
    take: 4,
    include: { variants: true },
  })) : [];

  const images = [p.imageUrl, ...safeJSON<string[]>(p.images, [])].filter(Boolean) as string[];
  const effective = p.salePrice ?? p.price;
  const avg = p.reviews.length ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length : 0;
  const unitLabel = formatUnit(p.unitQty, p.unitType);

  const jsonLd: any = { ...productSchema(p, process.env.SITE_URL || "https://shenterprises.lk"), image: images };
  if (p.reviews.length > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avg.toFixed(1),
      reviewCount: p.reviews.length
    };
  }

  const siteUrl = process.env.SITE_URL || "https://shenterprises.lk";
  const breadcrumbCrumbs = [
    { name: "Home", url: "/" },
    ...(p.category ? [{ name: p.category.name, url: `/category/${p.category.slug}` }] : []),
    { name: p.name, url: `/product/${p.slug}` },
  ];

  return (
    <div className="container-x py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <JsonLd data={breadcrumbSchema(siteUrl, breadcrumbCrumbs)} />
      <nav className="text-sm text-brand-700 mb-4">
        <Link href="/">{(await getT())("breadcrumb_home")}</Link> /{" "}
        {p.category && (<><Link href={`/category/${p.category.slug}`}>{p.category.name}</Link> / </>)}
        <span>{p.name}</span>
      </nav>

      <ProductTopSection key={p.id + ":" + p.updatedAt.toISOString()}
        product={{
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: p.price,
          salePrice: p.salePrice,
          sku: p.sku,
          imageUrl: p.imageUrl,
          stock: p.stock,
          outOfStock: (p as any).outOfStock ?? false,
        }}
        images={images}
        variants={p.variants.map(v => ({
          id: v.id,
          type: v.type,
          name: v.name,
          nameSi: (v as any).nameSi ?? null,
          nameTa: (v as any).nameTa ?? null,
          imageUrl: v.imageUrl,
          price: (v as any).price ?? null,
          salePrice: (v as any).salePrice ?? null,
          outOfStock: (v as any).outOfStock ?? false,
        }))}
        unitLabel={unitLabel}
        avgRating={avg}
        reviewCount={p.reviews.length}
        categoryName={p.category?.name ?? null}
      />

      {related.length > 0 && (
        <div className="mt-12">
          <RelatedHeading />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            {related.map((r) => <ProductCard key={r.id} p={r as any} />)}
          </div>
        </div>
      )}

      <ReviewSection
        productId={p.id}
        initialReviews={p.reviews.map((r) => ({
          id: r.id, name: r.name, rating: r.rating, title: r.title, body: r.body, createdAt: r.createdAt.toISOString()
        }))}
      />
    </div>
  );
}
