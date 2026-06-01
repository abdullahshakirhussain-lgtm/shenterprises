import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminOrders({ searchParams }: { searchParams: { status?: string } }) {
  const status = searchParams.status;
  const orders = await prisma.order.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200
  });
  const statuses = ["all", "pending", "paid", "shipped", "delivered", "cancelled"];
  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl text-brand-900 mb-4">Orders</h1>
      <div className="flex gap-2 mb-3 flex-wrap">
        {statuses.map((s) => (
          <Link key={s} href={s === "all" ? "/admin/orders" : `/admin/orders?status=${s}`}
            className={`px-3 py-1 text-sm rounded border ${(status || "all") === s ? "bg-brand-600 text-white border-brand-600" : "bg-white border-brand-200"}`}>
            {s}
          </Link>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-50"><tr className="text-left">
            <th className="p-2">Order #</th><th className="p-2">Date</th><th className="p-2">Customer</th>
            <th className="p-2">District</th><th className="p-2">Method</th><th className="p-2">Total</th><th className="p-2">Status</th>
          </tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-brand-100">
                <td className="p-2"><Link href={`/admin/orders/${o.id}`} className="text-brand-700 underline">{o.orderNumber}</Link></td>
                <td className="p-2">{new Date(o.createdAt).toLocaleString()}</td>
                <td className="p-2">{o.fullName} <span className="text-brand-500 text-xs">({o.phone})</span></td>
                <td className="p-2">{o.districtName} / {o.cityName}</td>
                <td className="p-2">{o.paymentMethod.toUpperCase()}</td>
                <td className="p-2">{formatLKR(o.total)}</td>
                <td className="p-2"><span className="px-2 py-0.5 rounded bg-brand-100 text-xs">{o.status}</span></td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-brand-600">No orders.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
