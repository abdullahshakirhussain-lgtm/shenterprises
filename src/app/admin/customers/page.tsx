import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCustomers() {
  const customers = await prisma.customer.findMany({
    include: { orders: { select: { total: true } } },
    orderBy: { createdAt: "desc" },
    take: 500
  });
  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl text-brand-900 mb-4">Customers</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-50"><tr className="text-left">
            <th className="p-2">Name</th><th className="p-2">Phone</th><th className="p-2">Email</th>
            <th className="p-2">Orders</th><th className="p-2">Lifetime value</th><th className="p-2">Joined</th>
          </tr></thead>
          <tbody>
            {customers.map((c) => {
              const lv = c.orders.reduce((s, o) => s + o.total, 0);
              return (
                <tr key={c.id} className="border-t border-brand-100">
                  <td className="p-2">{c.fullName}</td>
                  <td className="p-2">{c.phone}</td>
                  <td className="p-2">{c.email || "—"}</td>
                  <td className="p-2">{c.orders.length}</td>
                  <td className="p-2">{formatLKR(lv)}</td>
                  <td className="p-2">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {customers.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-brand-600">No customers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
