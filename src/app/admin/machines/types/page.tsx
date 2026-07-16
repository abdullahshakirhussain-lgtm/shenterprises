import { prisma } from "@/lib/prisma";
import Link from "next/link";
import MachineTypesManager from "./MachineTypesManager";

export const dynamic = "force-dynamic";

/**
 * Manage machine types — the SEO hub layer. Each type gets a public hub page
 * at /machines/{slug} targeting head terms ("embroidery machine price sri
 * lanka"). Machines join via Machine.category === MachineType.name.
 */
export default async function AdminMachineTypes() {
  const [types, counts] = await Promise.all([
    prisma.machineType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.machine.groupBy({ by: ["category"], where: { active: true }, _count: { _all: true } }),
  ]);
  const countByName = new Map(counts.map(c => [c.category || "", c._count._all]));

  return (
    <div className="container-x py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl text-brand-900">Machine types ({types.length})</h1>
        <Link href="/admin/machines" className="btn-secondary">← Machines</Link>
      </div>
      <p className="text-sm text-brand-600 mb-4">
        Each type gets an SEO hub page at <code>/machines/&lt;slug&gt;</code>. Fill the SEO intro with what buyers
        search (&quot;embroidery machine price Sri Lanka&quot;) and mention competitor brands at class level.
      </p>
      <MachineTypesManager
        initialTypes={types.map(t => ({
          id: t.id, name: t.name, slug: t.slug, blurb: t.blurb, seoIntro: t.seoIntro,
          faq: t.faq, sortOrder: t.sortOrder, machineCount: countByName.get(t.name) || 0,
        }))}
      />
    </div>
  );
}
