import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Offers — Discounted Craft & Tailoring Supplies",
  description: "Special discounts on threads, zippers, buttons and more at SH Enterprises."
};

export default async function OffersPage() {
  const items = await prisma.product.findMany({
    where: { active: true, onOffer: true },
    orderBy: { updatedAt: "desc" },
    include: { variants: true }
  });
  return (
    <div className="container-x py-8">
      <h1 className="font-display text-3xl text-brand-900 mb-6">Offers</h1>
      {items.length === 0 ? (
        <p className="text-brand-700">No offers running right now.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
