import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [productCount, orderCount, pendingOrders, customerCount, revenueAgg, recentOrders, lowStock] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: "pending" } }),
    prisma.customer.count(),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { in: ["paid", "shipped", "delivered"] } } }),
    prisma.order.findMany({ take: 8, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ where: { stock: { lte: 5 }, active: true }, take: 8, orderBy: { stock: "asc" } })
  ]);

  const stats = [
    { label: "Products", value: productCount, href: "/admin/products" },
    { label: "Orders", value: orderCount, href: "/admin/orders" },
    { label: "Pending orders", value: pendingOrders, href: "/admin/orders?status=pending" },
    { label: "Customers", value: customerCount, href: "/admin/customers" },
    { label: "Revenue", value: formatLKR(revenueAgg._sum.total || 0), href: "/admin/orders" }
  ];

  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl text-brand-900 mb-4">Dashboard</h1>
      <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 hover:border-brand-400">
            <div className="text-xs uppercase text-brand-600">{s.label}</div>
            <div className="text-2xl font-semibold text-brand-900">{s.value}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Recent orders</h2>
          {recentOrders.length === 0 ? <p className="text-sm text-brand-600">No orders yet.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-brand-600"><th>Order #</th><th>Name</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-t border-brand-100">
                    <td className="py-2"><Link className="text-brand-700 underline" href={`/admin/orders/${o.id}`}>{o.orderNumber}</Link></td>
                    <td>{o.fullName}</td>
                    <td>{formatLKR(o.total)}</td>
                    <td><span className="px-2 py-0.5 rounded bg-brand-100 text-xs">{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Low stock</h2>
          {lowStock.length === 0 ? <p className="text-sm text-brand-600">All good.</p> : (
            <ul className="text-sm divide-y divide-brand-100">
              {lowStock.map((p) => (
                <li key={p.id} className="py-2 flex justify-between">
                  <Link href={`/admin/products/${p.id}/edit`} className="text-brand-700 underline">{p.name}</Link>
                  <span className={p.stock === 0 ? "text-red-700" : "text-amber-700"}>{p.stock} left</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
