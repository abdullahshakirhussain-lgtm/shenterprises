import { prisma } from "@/lib/prisma";
import DeliveryEditor from "./Editor";

export const dynamic = "force-dynamic";

export default async function AdminDelivery() {
  const districts = await prisma.district.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl text-brand-900 mb-2">Delivery rates</h1>
      <p className="text-sm text-brand-700 mb-4">
        Per-district fallback rate. Used when Koombiyo API is not configured or doesn't return a rate. Free delivery threshold is configured in Settings.
      </p>
      <DeliveryEditor initial={districts.map((d) => ({ id: d.id, name: d.name, deliveryFee: d.deliveryFee }))} />
    </div>
  );
}
