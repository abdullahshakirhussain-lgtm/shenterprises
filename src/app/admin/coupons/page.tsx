import { prisma } from "@/lib/prisma";
import CouponsEditor from "./Editor";

export const dynamic = "force-dynamic";

export default async function AdminCoupons() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl text-brand-900 mb-4">Coupons</h1>
      <CouponsEditor initial={coupons.map((c) => ({
        ...c,
        expiresAt: c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : null
      }))} />
    </div>
  );
}
