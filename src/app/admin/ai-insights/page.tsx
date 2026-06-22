import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI Insights — SH Admin" };

const ATTRIBUTION_WINDOW_DAYS = 7;

export default async function AIInsightsPage() {
  // Pull aggregate stats and the most useful slices
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // last 30 days

  const [totalSessions, ratedSessions, attributedSessions, sessionsLast30, recentLowRated] = await Promise.all([
    prisma.chatSession.count(),
    prisma.chatSession.count({ where: { ratingScore: { not: null } } }),
    prisma.chatSession.count({ where: { orderId: { not: null } } }),
    prisma.chatSession.count({ where: { startedAt: { gte: since } } }),
    prisma.chatSession.findMany({
      where: { ratingScore: { lte: 3, gt: 0 } },
      orderBy: { ratedAt: "desc" },
      take: 8,
      select: {
        id: true,
        queryText: true,
        ratingScore: true,
        ratingComment: true,
        ratedAt: true,
        addedCount: true,
        totalSuggestions: true,
      },
    }),
  ]);

  const avgRatingAgg = await prisma.chatSession.aggregate({
    _avg: { ratingScore: true },
    where: { ratingScore: { not: null } },
  });

  // Top winning suggestions — those most often ordered after being suggested
  const topWinners: any[] = await prisma.$queryRawUnsafe(
    `SELECT
       p.id,
       p.name,
       p.slug,
       COUNT(*)::int AS times_suggested,
       SUM(CASE WHEN cs."thumbsUp" = true THEN 1 ELSE 0 END)::int AS thumbs_up,
       SUM(CASE WHEN cs."thumbsUp" = false THEN 1 ELSE 0 END)::int AS thumbs_down,
       SUM(CASE WHEN cs."addedToCart" = true THEN 1 ELSE 0 END)::int AS added,
       SUM(CASE WHEN cs."inOrderId" IS NOT NULL THEN 1 ELSE 0 END)::int AS ordered
     FROM "ChatSuggestion" cs
     JOIN "Product" p ON p.id = cs."productId"
     GROUP BY p.id, p.name, p.slug
     HAVING COUNT(*) >= 2
     ORDER BY ordered DESC, added DESC, thumbs_up DESC
     LIMIT 10`
  );

  // Bottom — most thumbs-down or never added
  const topLosers: any[] = await prisma.$queryRawUnsafe(
    `SELECT
       p.id,
       p.name,
       p.slug,
       COUNT(*)::int AS times_suggested,
       SUM(CASE WHEN cs."thumbsUp" = false THEN 1 ELSE 0 END)::int AS thumbs_down,
       SUM(CASE WHEN cs."addedToCart" = true THEN 1 ELSE 0 END)::int AS added
     FROM "ChatSuggestion" cs
     JOIN "Product" p ON p.id = cs."productId"
     GROUP BY p.id, p.name, p.slug
     HAVING COUNT(*) >= 3
     ORDER BY thumbs_down DESC, added ASC
     LIMIT 10`
  );

  const conversionRate = totalSessions > 0 ? (attributedSessions / totalSessions) * 100 : 0;

  return (
    <div className="container-x py-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-2xl text-brand-900">AI Insights</h1>
        <Link href="/admin/ai-tools" className="text-sm text-brand-700 underline">AI Tools →</Link>
      </div>
      <p className="text-brand-700 text-sm mb-6">
        What the AI Helper is doing and how customers are reacting. Data is collected once the feature is live.
      </p>

      {/* Headline KPIs */}
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="Total chats" value={totalSessions.toLocaleString()} sub={`${sessionsLast30} in last 30 days`} />
        <Kpi label="Avg rating" value={avgRatingAgg._avg.ratingScore?.toFixed(2) ?? "—"} sub={`${ratedSessions} rated`} />
        <Kpi label="Chats → orders" value={`${conversionRate.toFixed(1)}%`} sub={`${attributedSessions} attributed`} />
        <Kpi label="Attribution window" value={`${ATTRIBUTION_WINDOW_DAYS} days`} sub="orders within this window count" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Top winners */}
        <section className="card p-5">
          <h2 className="font-display text-lg text-brand-900 mb-3">Winning suggestions</h2>
          <p className="text-xs text-brand-600 mb-3">Products the AI suggests that customers actually buy or like.</p>
          {topWinners.length === 0 ? (
            <p className="text-sm text-brand-500 italic">Not enough data yet.</p>
          ) : (
            <div className="space-y-1">
              {topWinners.map((p) => (
                <Link key={p.id} href={`/product/${p.slug}`} target="_blank"
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-brand-50 transition-colors">
                  <span className="text-sm font-medium text-brand-900 truncate">{p.name}</span>
                  <span className="shrink-0 text-xs font-mono text-brand-600 tabular-nums">
                    {p.ordered}🛒 · {p.added}+ · {p.thumbs_up}👍{p.thumbs_down > 0 && <> · {p.thumbs_down}👎</>} · {p.times_suggested}×
                  </span>
                </Link>
              ))}
            </div>
          )}
          <p className="text-[10px] text-brand-500 mt-3 italic">
            🛒 = ended up in a real order · + = added to cart · × = total times suggested
          </p>
        </section>

        {/* Top losers */}
        <section className="card p-5">
          <h2 className="font-display text-lg text-brand-900 mb-3">Underperformers</h2>
          <p className="text-xs text-brand-600 mb-3">Products the AI suggests that customers reject or ignore — consider improving the description or removing from recommendations.</p>
          {topLosers.length === 0 ? (
            <p className="text-sm text-brand-500 italic">Not enough data yet.</p>
          ) : (
            <div className="space-y-1">
              {topLosers.map((p) => (
                <Link key={p.id} href={`/admin/products?q=${encodeURIComponent(p.name)}`}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-brand-50 transition-colors">
                  <span className="text-sm font-medium text-brand-900 truncate">{p.name}</span>
                  <span className="shrink-0 text-xs font-mono text-brand-600 tabular-nums">
                    {p.thumbs_down}👎 · {p.added}+ · {p.times_suggested}×
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent low-rated chats */}
      <section className="card p-5">
        <h2 className="font-display text-lg text-brand-900 mb-3">Recent low-rated chats (≤ 3 stars)</h2>
        <p className="text-xs text-brand-600 mb-3">Look at what people asked for — patterns here highlight where the AI is letting customers down.</p>
        {recentLowRated.length === 0 ? (
          <p className="text-sm text-brand-500 italic">No low ratings yet. 🎉</p>
        ) : (
          <div className="space-y-2">
            {recentLowRated.map((s) => (
              <div key={s.id} className="border border-brand-200 rounded p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-brand-900 italic flex-1">&ldquo;{s.queryText.slice(0, 200)}{s.queryText.length > 200 ? "…" : ""}&rdquo;</p>
                  <div className="shrink-0 text-right">
                    <div className="text-saffron-500 text-sm">{"★".repeat(s.ratingScore || 0)}{"☆".repeat(5 - (s.ratingScore || 0))}</div>
                    <div className="text-[10px] text-brand-500">
                      {s.addedCount}/{s.totalSuggestions} added
                    </div>
                  </div>
                </div>
                {s.ratingComment && (
                  <p className="text-xs text-brand-700 mt-2 bg-amber-50 border-l-2 border-amber-300 px-2 py-1">
                    &ldquo;{s.ratingComment}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-brand-600 mb-1">{label}</p>
      <p className="font-display text-2xl font-bold text-brand-900">{value}</p>
      {sub && <p className="text-xs text-brand-500 mt-0.5">{sub}</p>}
    </div>
  );
}
