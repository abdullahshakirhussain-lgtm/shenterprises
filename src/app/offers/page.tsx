import ProductCard from "@/components/ProductCard";
import { getT } from "@/lib/i18n-server";
import { fetchOfferProducts } from "@/lib/offers";
import { memo } from "@/lib/memo";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Offers — Discounted Craft & Tailoring Supplies",
  description: "Special discounts on threads, zippers, buttons and more at SH Enterprises.",
  alternates: { canonical: "/offers" }
};

// With only a handful of offers the page looked empty/broken, so it's topped up
// with the newest products under a clear "More to explore" heading.
const FILL_BELOW = 8;

export default async function OffersPage() {
  // Any product with a genuine sale price OR flagged on-offer.
  const items = await memo("offers:all", () => fetchOfferProducts());
  const more = items.length < FILL_BELOW
    ? await memo("offers:more", () => prisma.product.findMany({ where: { active: true, outOfStock: false }, orderBy: { createdAt: "desc" }, take: 16, include: { variants: true } }))
    : [];
  const offerIds = new Set(items.map((p: any) => p.id));
  const fill = more.filter(p => !offerIds.has(p.id)).slice(0, 8);
  const t = await getT();
  return (
    <div className="container-x py-8">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-saffron-600 mb-1">Limited time</p>
      <h1 className="font-display text-3xl text-brand-900">{t("offers")}</h1>
      <p className="text-ink-mute mt-2 mb-6 max-w-xl">
        {items.length > 0
          ? `${items.length} product${items.length === 1 ? "" : "s"} on offer right now — prices already reduced, while stock lasts.`
          : "No offers running right now — check back soon, or browse what's new below."}
      </p>
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((p) => <ProductCard key={p.id} p={p as any} />)}
        </div>
      )}
      {fill.length > 0 && (
        <section className="mt-12">
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-display text-2xl text-brand-900">More to explore</h2>
            <Link href="/shop" className="text-sm font-bold text-saffron-700 underline decoration-dashed underline-offset-4">Shop all →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {fill.map((p) => <ProductCard key={p.id} p={p as any} />)}
          </div>
        </section>
      )}
    </div>
  );
}
