import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";
import RebuildButton from "./RebuildButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer Profiles — SH Admin" };

const TYPE_LABELS: Record<string, string> = {
  professional_tailor: "Professional tailor",
  boutique_owner: "Boutique owner",
  hobbyist: "Hobbyist",
  bulk_event_buyer: "Event buyer",
  gifter: "Gifter",
  student: "Student",
  casual_browser: "Casual browser",
  unknown: "Unknown",
};

const TYPE_COLORS: Record<string, string> = {
  professional_tailor: "bg-thread-teal-500",
  boutique_owner: "bg-saffron-600",
  hobbyist: "bg-saffron-400",
  bulk_event_buyer: "bg-thread-maple-500",
  gifter: "bg-saffron-300",
  student: "bg-brand-400",
  casual_browser: "bg-brand-300",
  unknown: "bg-brand-200",
};

export default async function ProfilesPage() {
  const [total, byType, recent, topByLtv] = await Promise.all([
    prisma.customerProfile.count(),
    prisma.customerProfile.groupBy({
      by: ["customerType"],
      _count: { customerType: true },
      _avg: { ltv: true, aov: true, engagementScore: true },
      orderBy: { _count: { customerType: "desc" } },
    }),
    prisma.customerProfile.findMany({
      orderBy: { lastSeenAt: "desc" },
      take: 20,
      select: {
        id: true, browserId: true, userId: true, customerType: true,
        engagementScore: true, ltv: true, orderCount: true,
        lastSeenAt: true, lastOrderAt: true,
      },
    }),
    prisma.customerProfile.findMany({
      where: { ltv: { gt: 0 } },
      orderBy: { ltv: "desc" },
      take: 10,
      select: {
        id: true, browserId: true, userId: true, customerType: true,
        ltv: true, orderCount: true, lastOrderAt: true,
      },
    }),
  ]);

  return (
    <div className="container-x py-6">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="font-display text-2xl text-brand-900">Customer Profiles</h1>
        <RebuildButton />
      </div>
      <p className="text-brand-700 text-sm mb-6 max-w-2xl">
        Each profile aggregates one visitor&apos;s entire history — page views, cart events, chat sessions, orders.
        Used to power personalised recommendations and (later) situational pricing.
        Rebuilds every 15 min via cron, or click <em>Rebuild now</em>.
      </p>

      {/* KPIs */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6 max-w-3xl">
        <Kpi label="Total profiles" value={total.toLocaleString()} />
        <Kpi
          label="Identified (any type)"
          value={(total - (byType.find(b => b.customerType === "unknown")?._count.customerType ?? 0)).toLocaleString()}
        />
        <Kpi
          label="With orders"
          value={topByLtv.length > 0 ? `${topByLtv.length}+` : "0"}
        />
      </div>

      {/* Type distribution */}
      <section className="card p-5 mb-6 max-w-3xl">
        <h2 className="font-display text-lg text-brand-900 mb-3">Type distribution</h2>
        {byType.length === 0 ? (
          <p className="text-sm text-brand-500 italic">No profiles yet. Click Rebuild now to compute from existing events.</p>
        ) : (
          <div className="space-y-2">
            {byType.map(b => {
              const pct = total > 0 ? (b._count.customerType / total) * 100 : 0;
              const color = TYPE_COLORS[b.customerType] || "bg-brand-200";
              const label = TYPE_LABELS[b.customerType] || b.customerType;
              return (
                <div key={b.customerType} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-brand-900">{label}</span>
                    <span className="font-mono text-xs text-brand-600 tabular-nums">
                      {b._count.customerType} · {pct.toFixed(0)}%
                      {b._avg.ltv && b._avg.ltv > 0 && <> · avg LTV {formatLKR(b._avg.ltv)}</>}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-brand-100 overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent */}
        <section className="card p-5">
          <h2 className="font-display text-lg text-brand-900 mb-3">Most recently active</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-brand-500 italic">No profiles yet.</p>
          ) : (
            <div className="space-y-1.5">
              {recent.map(p => (
                <ProfileRow key={p.id} p={p} />
              ))}
            </div>
          )}
        </section>

        {/* Top by LTV */}
        <section className="card p-5">
          <h2 className="font-display text-lg text-brand-900 mb-3">Top by lifetime value</h2>
          {topByLtv.length === 0 ? (
            <p className="text-sm text-brand-500 italic">No orders attributed yet.</p>
          ) : (
            <div className="space-y-1.5">
              {topByLtv.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-brand-50">
                  <span className="text-sm font-medium text-brand-900">
                    {p.userId ? `User #${p.userId}` : <span className="font-mono text-xs">{p.browserId.slice(0, 14)}…</span>}
                    <span className="ml-2 text-xs text-brand-600">{TYPE_LABELS[p.customerType] || p.customerType}</span>
                  </span>
                  <span className="text-sm font-mono text-saffron-700 tabular-nums">
                    {formatLKR(p.ltv)} · {p.orderCount}×
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-brand-600 mb-1">{label}</p>
      <p className="font-display text-2xl font-bold text-brand-900">{value}</p>
    </div>
  );
}

function ProfileRow({ p }: { p: any }) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-brand-50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${TYPE_COLORS[p.customerType] || "bg-brand-200"}`} />
          <span className="text-sm font-medium text-brand-900 truncate">
            {p.userId ? `User #${p.userId}` : <span className="font-mono text-xs">{p.browserId.slice(0, 14)}…</span>}
          </span>
        </div>
        <p className="text-[11px] text-brand-600">
          {TYPE_LABELS[p.customerType] || p.customerType}
          {" · "}engagement {Math.round(p.engagementScore)}
          {p.orderCount > 0 && <> · {p.orderCount} orders</>}
        </p>
      </div>
      <span className="text-[10px] text-brand-500 shrink-0 font-mono">
        {new Date(p.lastSeenAt).toLocaleDateString("en-LK", { month: "short", day: "numeric" })}
      </span>
    </div>
  );
}
