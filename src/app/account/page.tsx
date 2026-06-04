import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/userAuth";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { formatLKR } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Account", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login?next=/account");

  const [orders, globalRate] = await Promise.all([
    prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    getSetting("account_discount_percent")
  ]);
  const effective = user.discountRate > 0 ? user.discountRate : parseFloat(globalRate || "0");

  return (
    <div className="container-x py-8 grid lg:grid-cols-3 gap-6">
      <aside className="card p-5 h-fit">
        <h2 className="font-semibold text-lg">{user.fullName}</h2>
        <div className="text-sm text-brand-700">{user.phone}</div>
{effective > 0 && (
          <div className="mt-3 p-2 bg-brand-50 rounded border border-brand-200 text-sm">
            🎉 Member discount: <strong>{effective}%</strong> off every order
          </div>
        )}
        <form action="/api/auth/logout" method="POST" className="mt-4">
          <button className="btn-secondary w-full">Log out</button>
        </form>
      </aside>
      <section className="lg:col-span-2 space-y-3">
        <h1 className="font-display text-2xl text-brand-900">My orders</h1>
        {orders.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-brand-700 mb-3">You haven't placed any orders yet.</p>
            <Link href="/" className="btn-primary">Start shopping</Link>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50"><tr className="text-left">
                <th className="p-2">Order #</th><th className="p-2">Date</th><th className="p-2">Total</th><th className="p-2">Status</th>
              </tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-brand-100">
                    <td className="p-2 font-mono">{o.orderNumber}</td>
                    <td className="p-2">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="p-2">{formatLKR(o.total)}</td>
                    <td className="p-2"><span className="px-2 py-0.5 rounded bg-brand-100 text-xs">{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
