import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatLKR, safeJSON } from "@/lib/utils";
import AddToCartButton from "@/components/AddToCartButton";
import ReviewSection from "@/components/ReviewSection";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await prisma.product.findUnique({ where: { slug: params.slug } });
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

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const p = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      category: true,
      reviews: { where: { approved: true }, orderBy: { createdAt: "desc" } }
    }
  });
  if (!p || !p.active) notFound();

  const images = [p.imageUrl, ...safeJSON<string[]>(p.images, [])].filter(Boolean) as string[];
  const effective = p.salePrice ?? p.price;
  const avg = p.reviews.length ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length : 0;

  const jsonLd: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: images,
    sku: p.sku,
    offers: {
      "@type": "Offer",
      priceCurrency: "LKR",
      price: effective,
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    }
  };
  if (p.reviews.length > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avg.toFixed(1),
      reviewCount: p.reviews.length
    };
  }

  return (
    <div className="container-x py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="text-sm text-brand-700 mb-4">
        <Link href="/">Home</Link> /{" "}
        {p.category && (<><Link href={`/category/${p.category.slug}`}>{p.category.name}</Link> / </>)}
        <span>{p.name}</span>
      </nav>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="aspect-square bg-brand-50 rounded-lg overflow-hidden">
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[0]} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-brand-300 text-7xl">🧵</div>
            )}
          </div>
        </div>
        <div>
          <h1 className="font-display text-3xl text-brand-900">{p.name}</h1>
          {p.reviews.length > 0 && (
            <div className="mt-1 text-sm">
              <span className="text-amber-500">{"★".repeat(Math.round(avg))}</span>
              <span className="text-brand-700"> {avg.toFixed(1)} ({p.reviews.length} review{p.reviews.length === 1 ? "" : "s"})</span>
            </div>
          )}
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-brand-700">{formatLKR(effective)}</span>
            {p.salePrice && <span className="line-through text-brand-400">{formatLKR(p.price)}</span>}
          </div>
          {p.sku && <div className="mt-1 text-xs text-brand-600">SKU: {p.sku}</div>}
          <div className={`mt-2 text-sm ${p.stock > 0 ? "text-green-700" : "text-red-700"}`}>
            {p.stock > 0 ? `In stock (${p.stock})` : "Out of stock"}
          </div>
          {p.description && <p className="mt-4 text-brand-800 whitespace-pre-line">{p.description}</p>}
          <div className="mt-6 max-w-xs">
            <AddToCartButton
              product={{ id: p.id, name: p.name, slug: p.slug, price: effective, imageUrl: p.imageUrl }}
              disabled={p.stock <= 0}
            />
          </div>
          <div className="mt-6 text-sm text-brand-700 space-y-1">
            <div>✓ Cash on delivery available</div>
            <div>✓ Bank deposit accepted</div>
            <div>✓ Island-wide delivery</div>
          </div>
        </div>
      </div>

      <ReviewSection
        productId={p.id}
        initialReviews={p.reviews.map((r) => ({
          id: r.id, name: r.name, rating: r.rating, title: r.title, body: r.body, createdAt: r.createdAt.toISOString()
        }))}
      />
    </div>
  );
}
