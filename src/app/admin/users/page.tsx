import { prisma } from "@/lib/prisma";
import UserDiscountForm from "./DiscountForm";

export const dynamic = "force-dynamic";

export default async function AdminUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { orders: { select: { total: true } } }
  });
  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl text-brand-900 mb-4">Registered customers ({users.length})</h1>
      <p className="text-sm text-brand-700 mb-4">Discount rate &gt; 0 overrides the global member discount in Settings.</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-50"><tr className="text-left">
            <th className="p-2">Name</th><th className="p-2">Phone</th><th className="p-2">Email</th>
            <th className="p-2">Orders</th><th className="p-2">Lifetime value</th><th className="p-2">Joined</th>
            <th className="p-2">Discount %</th>
          </tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-brand-100">
                <td className="p-2">{u.fullName}</td>
                <td className="p-2">{u.phone}</td>
                <td className="p-2">{u.email || "—"}</td>
                <td className="p-2">{u.orders.length}</td>
                <td className="p-2">Rs. {u.orders.reduce((s, o) => s + o.total, 0).toLocaleString()}</td>
                <td className="p-2">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="p-2"><UserDiscountForm userId={u.id} initial={u.discountRate} /></td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-brand-600">No registered users yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
