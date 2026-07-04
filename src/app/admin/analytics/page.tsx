import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

function n(v: any): number { return typeof v === "bigint" ? Number(v) : Number(v || 0); }

export default async function AdminAnalytics({ searchParams }: { searchParams: { days?: string } }) {
  const days = [7, 30, 90].includes(parseInt(searchParams.days || "")) ? parseInt(searchParams.days!) : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [sessions, events, abandonedCarts, sourcesRaw] = await Promise.all([
    prisma.analyticsSession.findMany({ where: { lastSeen: { gte: since } }, orderBy: { lastSeen: "desc" }, take: 100 }),
    prisma.analyticsEvent.groupBy({ by: ["type"], _count: { _all: true }, where: { createdAt: { gte: since } } }),
    prisma.cart.findMany({ where: { abandoned: true, updatedAt: { gte: since }, total: { gt: 0 } }, orderBy: { updatedAt: "desc" }, take: 50 }),
    prisma.analyticsSession.groupBy({ by: ["source"], _count: { _all: true }, where: { firstSeen: { gte: since } } }),
  ]);

  // ---- Top products: views + cart-adds + view->cart conversion ----
  const topRows: any[] = await prisma.$queryRawUnsafe(
    `SELECT "productId",
       COUNT(*) FILTER (WHERE type = 'product_view') AS views,
       COUNT(*) FILTER (WHERE type = 'add_to_cart')  AS carts
     FROM "AnalyticsEvent"
     WHERE "productId" IS NOT NULL AND "createdAt" >= $1
     GROUP BY "productId"
     ORDER BY views DESC NULLS LAST
     LIMIT 15`,
    since
  );

  // ---- Pairings: products seen together within the same session ----
  const pairRows: any[] = await prisma.$queryRawUnsafe(
    `SELECT a."productId" AS p1, b."productId" AS p2,
            COUNT(DISTINCT a."sessionId") AS cnt
     FROM "AnalyticsEvent" a
     JOIN "AnalyticsEvent" b
       ON a."sessionId" = b."sessionId" AND a."productId" < b."productId"
     WHERE a."productId" IS NOT NULL AND b."productId" IS NOT NULL
       AND a.type IN ('product_view','add_to_cart')
       AND b.type IN ('product_view','add_to_cart')
       AND a."createdAt" >= $1 AND b."createdAt" >= $1
     GROUP BY a."productId", b."productId"
     HAVING COUNT(DISTINCT a."sessionId") >= 2
     ORDER BY cnt DESC
     LIMIT 12`,
    since
  );

  // ---- Funnel: distinct sessions reaching each stage ----
  const funnelRows: any[] = await prisma.$queryRawUnsafe(
    `SELECT type, COUNT(DISTINCT "sessionId") AS sessions
     FROM "AnalyticsEvent"
     WHERE type IN ('product_view','add_to_cart','begin_checkout','whatsapp_click','purchase')
       AND "createdAt" >= $1
     GROUP BY type`,
    since
  );
  const funnelMap = new Map<string, number>(funnelRows.map(r => [r.type, n(r.sessions)]));
  const funnel = [
    { key: "product_view", label: "Viewed a product" },
    { key: "add_to_cart", label: "Added to cart" },
    { key: "begin_checkout", label: "Started checkout" },
    { key: "whatsapp_click", label: "Clicked WhatsApp" },
    { key: "purchase", label: "Purchased (on-site)" },
  ].map(s => ({ ...s, count: funnelMap.get(s.key) || 0 }));
  const funnelTop = funnel[0].count || 1;

  // ---- Known / repeat customers (phone linked, hash only) ----
  const knownCustomers = await prisma.analyticsSession.count({ where: { phoneHash: { not: null } } });

  // Resolve product names for the top + pairing tables
  const idSet = new Set<number>();
  topRows.forEach(r => idSet.add(r.productId));
  pairRows.forEach(r => { idSet.add(r.p1); idSet.add(r.p2); });
  const products = idSet.size
    ? await prisma.product.findMany({ where: { id: { in: [...idSet] } }, select: { id: true, name: true } })
    : [];
  const nameOf = (id: number) => products.find(p => p.id === id)?.name || `#${id}`;

  const totalSessions = sessions.length;

  return (
    <div className="container-x py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl text-brand-900">Analytics — last {days} days</h1>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <Link key={r.days} href={`/admin/analytics?days=${r.days}`}
              className={`text-sm px-3 py-1.5 rounded-lg border ${days === r.days ? "bg-brand-600 text-white border-brand-600" : "bg-white text-brand-700 border-brand-200 hover:bg-brand-50"}`}>
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4"><div className="text-xs uppercase text-brand-600">Sessions</div><div className="text-2xl font-semibold">{totalSessions}</div></div>
        <div className="card p-4"><div className="text-xs uppercase text-brand-600">Abandoned carts</div><div className="text-2xl font-semibold">{abandonedCarts.length}</div></div>
        <div className="card p-4"><div className="text-xs uppercase text-brand-600">Events</div><div className="text-2xl font-semibold">{events.reduce((s, e) => s + e._count._all, 0)}</div></div>
        <div className="card p-4"><div className="text-xs uppercase text-brand-600">Known customers</div><div className="text-2xl font-semibold">{knownCustomers}</div><div className="text-[10px] text-brand-500">phone-linked sessions</div></div>
      </div>

      {/* ===== Funnel ===== */}
      <div className="card p-5">
        <h2 className="font-semibold mb-1">Funnel — where visitors drop off</h2>
        <p className="text-xs text-brand-500 mb-3">Distinct sessions reaching each stage. Most orders close on WhatsApp, so the WhatsApp click is the key intent signal.</p>
        <div className="space-y-2">
          {funnel.map((s, i) => {
            const pct = Math.round((s.count / funnelTop) * 100);
            const prev = i > 0 ? funnel[i - 1].count : s.count;
            const dropPct = i > 0 && prev > 0 ? Math.round((1 - s.count / prev) * 100) : 0;
            return (
              <div key={s.key} className="text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-brand-900">{s.label}</span>
                  <span className="font-mono text-xs text-brand-600 tabular-nums">
                    {s.count}{i > 0 && dropPct > 0 && <span className="text-red-500 ml-2">−{dropPct}%</span>}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-brand-100 overflow-hidden">
                  <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ===== Top products ===== */}
        <div className="card p-5">
          <h2 className="font-semibold mb-1">Top products</h2>
          <p className="text-xs text-brand-500 mb-3">Views, cart-adds, and view→cart conversion.</p>
          {topRows.length === 0 ? <p className="text-sm text-brand-600">No product views yet in this range.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-brand-600 text-xs"><th className="pb-1">Product</th><th className="text-right">Views</th><th className="text-right">Carts</th><th className="text-right">Conv.</th></tr></thead>
              <tbody>
                {topRows.map(r => {
                  const views = n(r.views), carts = n(r.carts);
                  const conv = views > 0 ? Math.round((carts / views) * 100) : 0;
                  return (
                    <tr key={r.productId} className="border-t border-brand-100">
                      <td className="py-1 pr-2 truncate max-w-[160px]">{nameOf(r.productId)}</td>
                      <td className="text-right tabular-nums">{views}</td>
                      <td className="text-right tabular-nums">{carts}</td>
                      <td className="text-right tabular-nums font-semibold">{conv}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ===== Pairings ===== */}
        <div className="card p-5">
          <h2 className="font-semibold mb-1">Frequently viewed together</h2>
          <p className="text-xs text-brand-500 mb-3">Products the same visitor engaged with — bundle candidates.</p>
          {pairRows.length === 0 ? <p className="text-sm text-brand-600">Not enough data yet.</p> : (
            <table className="w-full text-sm">
              <tbody>
                {pairRows.map((r, i) => (
                  <tr key={i} className="border-t border-brand-100">
                    <td className="py-1 pr-2">
                      <span className="truncate">{nameOf(r.p1)}</span>
                      <span className="text-brand-400 mx-1">+</span>
                      <span className="truncate">{nameOf(r.p2)}</span>
                    </td>
                    <td className="text-right tabular-nums text-brand-600 whitespace-nowrap">{n(r.cnt)}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ===== Existing: sources + event mix ===== */}
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
