import ProductCard from "@/components/ProductCard";
import { smartSearch, productsByIds } from "@/lib/search";
import { getT } from "@/lib/i18n-server";
import { recordEvent } from "@/lib/analytics";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { memo } from "@/lib/memo";
import { getSetting } from "@/lib/settings";
import { normalizePhone } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

// Search-results pages are ?q= driven with unbounded variants and no standalone
// SEO value — noindex them (follow links) instead of minting a canonical per query.
export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const q = (searchParams.q || "").trim();
  const slim = q ? await smartSearch(q, 60) : [];
  const t = await getT();

  // Owned analytics — log the search query + how many results it returned.
  // Server-side so it captures every real search-results view. Best-effort.
  if (q) {
    recordEvent({ type: "search", meta: { query: q.slice(0, 120), results: slim.length } }).catch(() => {});
  }

  const items = slim.length
    ? await productsByIds(slim.map(p => p.id)) as any[]
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
        <NoResults q={q} message={t("search_no_results")} />
      ) : null}
    </div>
  );
}

// No matches: never a dead end — offer the categories and a WhatsApp question
// pre-filled with what they searched for (we may stock it under another name).
async function NoResults({ q, message }: { q: string; message: string }) {
  const [categories, phoneRaw] = await Promise.all([
    memo("categories", () => prisma.category.findMany({ orderBy: { sortOrder: "asc" } })),
    getSetting("site_phone"),
  ]);
  const phone = normalizePhone(phoneRaw || "");
  const wa = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hi! Do you have "${q}"?`)}` : null;
  return (
    <div className="card p-6 max-w-2xl">
      <p className="text-ink font-semibold">{message}</p>
      <p className="text-sm text-ink-mute mt-1">We may stock it under a different name — ask us, or browse a category:</p>
      {wa && (
        <a href={wa} className="inline-flex items-center gap-2 mt-4 rounded-xl bg-[#1F9D55] hover:bg-[#188247] text-white text-sm font-bold px-5 py-3 transition-colors">
          Ask on WhatsApp if we have “{q.slice(0, 40)}”
        </a>
      )}
      <div className="flex flex-wrap gap-2 mt-5">
        {categories.map(c => (
          <Link key={c.slug} href={`/category/${c.slug}`} className="min-h-[40px] inline-flex items-center px-4 rounded-full border border-saffron-300 bg-white text-sm font-semibold text-ink-soft hover:border-saffron-500 transition-colors">
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
