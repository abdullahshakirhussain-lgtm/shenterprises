import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prime Industrial Sewing Machines — Price Sri Lanka",
  description:
    "Prime industrial sewing machines in Sri Lanka — single needle lockstitch, overlock, and more. Authorized dealer, island-wide after-sales service. Call or WhatsApp to order.",
};

export default async function MachinesPage() {
  const machines = await prisma.machine.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="bg-ink text-cream">
      {/* Premium hero band — visually distinct from the accessory catalog */}
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20 text-center">
          <p className="text-xs font-bold uppercase tracking-[.25em] text-saffron-400 mb-3">Prime · Industrial</p>
          <h1 className="font-display font-semibold text-4xl sm:text-5xl md:text-6xl leading-tight">
            Industrial sewing machines
          </h1>
          <p className="mt-4 text-cream/70 max-w-xl mx-auto">
            Authorized Prime dealer in Sri Lanka. Built for production floors — backed by warranty and island-wide after-sales service.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        {machines.length === 0 ? (
          <p className="text-center text-cream/60 py-16">Machines are being added — check back soon.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {machines.map(m => (
              <Link
                key={m.id}
                href={`/machines/${m.slug}`}
                className="group rounded-2xl bg-white/5 border border-white/10 hover:border-saffron-400/60 overflow-hidden transition-colors"
              >
                <div className="aspect-[4/3] bg-white/5 overflow-hidden">
                  {m.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.imageUrl} alt={`${m.brand} ${m.modelNumber}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-5xl opacity-30">⚙️</div>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[.15em] text-saffron-400">{m.brand} · {m.modelNumber}</p>
                  <h2 className="font-display font-semibold text-lg mt-1 leading-snug">{m.name}</h2>
                  {m.category && <p className="text-xs text-cream/50 mt-1">{m.category}</p>}
                  <p className="mt-3 font-semibold text-saffron-300">
                    {m.price != null ? formatLKR(m.price) : "Enquire for price"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
