import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import { notFound } from "next/navigation";
import { getT, getServerLang } from "@/lib/i18n-server";
import { localizedName } from "@/lib/display";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const cat = await prisma.category.findUnique({ where: { slug: params.slug } });
  if (!cat) return { title: "Category not found" };
  return {
    title: `${cat.name} — Buy ${cat.name} Online in Sri Lanka`,
    description: `Shop ${cat.name.toLowerCase()} at SH Enterprises. Island-wide delivery in Sri Lanka with cash on delivery available.`,
    alternates: { canonical: `/category/${cat.slug}` }
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const cat = await prisma.category.findUnique({
    where: { slug: params.slug },
    include: { products: { where: { active: true }, orderBy: { createdAt: "desc" }, include: { variants: true } } }
  });
  if (!cat) notFound();

  const t = getT();
  const lang = getServerLang();
  const displayName = localizedName(cat as any, lang);

  return (
    <div className="container-x py-8">
      <nav className="text-sm text-brand-700 mb-2">
        <a href="/">{t("breadcrumb_home")}</a> / <span>{displayName}</span>
      </nav>
      <h1 className="font-display text-3xl text-brand-900 mb-6">{displayName}</h1>
      {cat.products.length === 0 ? (
        <p className="text-brand-700">{t("no_products_match")}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {cat.products.map((p) => <ProductCard key={p.id} p={p as any} />)}
        </div>
      )}
    </div>
  );
}
