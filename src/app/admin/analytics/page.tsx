import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAnalytics() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [sessions, events, abandonedCarts, sourcesRaw, topProducts] = await Promise.all([
    prisma.analyticsSession.findMany({ where: { lastSeen: { gte: since } }, orderBy: { lastSeen: "desc" }, take: 100 }),
    prisma.analyticsEvent.groupBy({ by: ["type"], _count: { _all: true }, where: { createdAt: { gte: since } } }),
    prisma.cart.findMany({ where: { abandoned: true, updatedAt: { gte: since }, total: { gt: 0 } }, orderBy: { updatedAt: "desc" }, take: 50 }),
    prisma.analyticsSession.groupBy({ by: ["source"], _count: { _all: true }, where: { firstSeen: { gte: since } } }),
    prisma.analyticsEvent.groupBy({ by: ["productId"], _count: { _all: true }, where: { type: "product_view", productId: { not: null }, createdAt: { gte: since } }, orderBy: { _count: { productId: "desc" } }, take: 10 })
  ]);

  // ping events accumulate time spent
  const pings = await prisma.analyticsEvent.findMany({ where: { type: "ping", createdAt: { gte: since } }, select: { sessionId: true, value: true } });
  const timeBySession: Record<string, number> = {};
  for (const p of pings) { timeBySession[p.sessionId] = (timeBySession[p.sessionId] || 0) + (p.value || 0); }

  const topProductIds = topProducts.map((t) => t.productId!).filter(Boolean);
  const productsLookup = topProductIds.length
    ? await prisma.product.findMany({ where: { id: { in: topProductIds } } })
    : [];

  const totalSessions = sessions.length;
  const avgSessionMs = totalSessions ? Math.round(Object.values(timeBySession).reduce((s, n) => s + n, 0) / totalSessions) : 0;

  return (
    <div className="container-x py-6 space-y-6">
      <h1 className="font-display text-2xl text-brand-900">Analytics — last 30 days</h1>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4"><div className="text-xs uppercase text-brand-600">Sessions</div><div className="text-2xl font-semibold">{totalSessions}</div></div>
        <div className="card p-4"><div className="text-xs uppercase text-brand-600">Avg time/session</div><div className="text-2xl font-semibold">{(avgSessionMs / 1000).toFixed(0)}s</div></div>
        <div className="card p-4"><div className="text-xs uppercase text-brand-600">Abandoned carts</div><div className="text-2xl font-semibold">{abandonedCarts.length}</div></div>
        <div className="card p-4"><div className="text-xs uppercase text-brand-600">Events</div><div className="text-2xl font-semibold">{events.reduce((s, e) => s + e._count._all, 0)}</div></div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Traffic sources</h2>
          <table className="w-full text-sm"><tbody>
            {sourcesRaw.map((s) => (
              <tr key={s.source || "unknown"} className="border-t border-brand-100">
                <td className="py-1">{s.source || "direct"}</td><td className="text-right">{s._count._all}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Event mix</h2>
          <table className="w-full text-sm"><tbody>
            {events.map((e) => (
              <tr key={e.type} className="border-t border-brand-100">
                <td className="py-1">{e.type}</td><td className="text-right">{e._count._all}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Most viewed products</h2>
        {topProducts.length === 0 ? <p className="text-sm text-brand-600">No product views yet.</p> : (
          <table className="w-full text-sm"><tbody>
            {topProducts.map((t) => {
              const p = productsLookup.find((x) => x.id === t.productId);
              return (
                <tr key={t.productId} className="border-t border-brand-100">
                  <td className="py-1">{p?.name || `Product #${t.productId}`}</td>
                  <td className="text-right">{t._count._all} views</td>
                </tr>
              );
            })}
          </tbody></table>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Abandoned carts ({abandonedCarts.length})</h2>
        {abandonedCarts.length === 0 ? <p className="text-sm text-brand-600">None.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-brand-600"><th>Session</th><th>Total</th><th>Updated</th></tr></thead>
            <tbody>
              {abandonedCarts.map((c) => (
                <tr key={c.id} className="border-t border-brand-100">
                  <td className="py-1 font-mono text-xs">{c.id.slice(0, 8)}…</td>
                  <td>{formatLKR(c.total)}</td>
                  <td>{new Date(c.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
