import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, featured, offers, latest] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, take: 12 }),
    prisma.product.findMany({ where: { active: true, featured: true }, take: 8, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ where: { active: true, onOffer: true }, take: 8, orderBy: { updatedAt: "desc" } }),
    prisma.product.findMany({ where: { active: true }, take: 12, orderBy: { createdAt: "desc" } })
  ]);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-100 via-brand-50 to-white border-b border-brand-100">
        <div className="container-x py-12 md:py-20 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="font-display text-4xl md:text-5xl text-brand-900 leading-tight">
              Everything you need for craft & tailoring
            </h1>
            <p className="mt-4 text-brand-800/80 text-lg">
              Threads, zippers, scissors, elastics, ribbons, buttons — quality supplies trusted by tailors and craft lovers across Sri Lanka.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/category/threads" className="btn-primary">Shop Threads</Link>
              <Link href="/offers" className="btn-secondary">View Offers</Link>
            </div>
            <div className="mt-6 flex gap-6 text-sm text-brand-800">
              <span>✓ Island-wide delivery</span>
              <span>✓ Cash on delivery</span>
              <span>✓ Bank deposit</span>
            </div>
          </div>
          <div className="hidden md:grid grid-cols-3 gap-3">
            {["🧵", "🪡", "✂️", "🎀", "👕", "🧷"].map((e, i) => (
              <div key={i} className="aspect-square bg-white rounded-xl shadow-sm grid place-items-center text-5xl">{e}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-x py-10">
        <h2 className="font-display text-2xl text-brand-900 mb-4">Shop by category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="card p-4 text-center hover:border-brand-400 hover:shadow-md transition"
            >
              <div className="text-3xl mb-1">{categoryEmoji(c.slug)}</div>
              <div className="font-medium text-brand-900">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Offers */}
      {offers.length > 0 && (
        <section className="container-x py-10">
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-display text-2xl text-brand-900">On Offer</h2>
            <Link href="/offers" className="text-brand-700 text-sm">See all →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {offers.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <section className="container-x py-10">
          <h2 className="font-display text-2xl text-brand-900 mb-4">Featured products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {featured.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* Latest */}
      <section className="container-x py-10">
        <h2 className="font-display text-2xl text-brand-900 mb-4">New arrivals</h2>
        {latest.length === 0 ? (
          <p className="text-brand-700">No products yet — check back soon.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {latest.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </>
  );
}

function categoryEmoji(slug: string) {
  const map: Record<string, string> = {
    threads: "🧵", zippers: "🔗", scissors: "✂️", elastics: "➰", ribbons: "🎀",
    buttons: "🔘", "needles-pins": "🪡", "lace-trims": "💮", "fabric-markers": "🖊️", "tools-accessories": "🧰"
  };
  return map[slug] || "🧶";
}
