import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import { smartSearch } from "@/lib/search";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q || "").trim();
  const slim = q ? await smartSearch(q, 60) : [];
  const t = getT();

  const items = slim.length
    ? await prisma.product.findMany({
        where: { id: { in: slim.map(p => p.id) } },
        include: { variants: true },
      }).then(rows => {
        const byId = new Map(rows.map(r => [r.id, r]));
        return slim.map(s => byId.get(s.id)).filter(Boolean) as any[];
      })
    : [];

  return (
    <div className="container-x py-8">
      <h1 className="font-display text-3xl text-brand-900 mb-2">{t("search")}</h1>
      <p className="text-brand-700 mb-6">
        {q ? <>{t("search_results_for")} <strong>“{q}”</strong> — {items.length} {t("search_found")}</> : t("search_placeholder")}
      </p>
      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      ) : q ? (
        <p className="text-brand-500 italic">{t("search_no_results")}</p>
      ) : null}
    </div>
  );
}
