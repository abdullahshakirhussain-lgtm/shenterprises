import ProductCard from "@/components/ProductCard";
import { getT } from "@/lib/i18n-server";
import { fetchOfferProducts } from "@/lib/offers";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Offers — Discounted Craft & Tailoring Supplies",
  description: "Special discounts on threads, zippers, buttons and more at SH Enterprises.",
  alternates: { canonical: "/offers" }
};

export default async function OffersPage() {
  // Any product with a genuine sale price OR flagged on-offer.
  const items = await fetchOfferProducts();
  const t = getT();
  return (
    <div className="container-x py-8">
      <h1 className="font-display text-3xl text-brand-900 mb-6">{t("offers")}</h1>
      {items.length === 0 ? (
        <p className="text-brand-700">{t("no_products_match")}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((p) => <ProductCard key={p.id} p={p as any} />)}
        </div>
      )}
    </div>
  );
}
