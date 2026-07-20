import Link from "next/link";
import MachineContactChooser from "@/components/MachineContactChooser";
import SmartImage from "@/components/SmartImage";

/**
 * Homepage "Industrial Machines" strip — deliberately minimal: just the topic,
 * a Browse button, one combined Call/WhatsApp action, and a horizontal row of
 * featured machine photos. A dark band so the high-value line pops against the
 * cream storefront. Machine ordering is controlled by `homeOrder` (see page.tsx).
 */

export type ShowcaseMachine = {
  id: number; slug: string; brand: string; modelNumber: string; name: string; category: string | null; imageUrl: string | null;
};

export default function MachinesShowcase({
  machines, phone, phoneDisplay,
}: {
  machines: ShowcaseMachine[];
  phone: string;
  phoneDisplay: string;
}) {
  if (machines.length === 0) return null;

  return (
    <section className="bg-[#1D1A16] text-cream relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[repeating-linear-gradient(90deg,#E0973F_0_12px,transparent_12px_26px)]" />

      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        {/* Topic + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display font-semibold text-2xl sm:text-3xl leading-tight">
            Industrial sewing &amp; <span className="italic text-[#E0973F]">embroidery machines</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/machines" className="inline-flex items-center gap-2 rounded-xl bg-[#E0973F] hover:bg-[#cf8836] text-[#1D1A16] font-bold px-5 py-3 transition-colors">
              Browse all machines <span className="font-display italic font-light">→</span>
            </Link>
            <MachineContactChooser phone={phone} phoneDisplay={phoneDisplay} />
          </div>
        </div>

        {/* Featured machine photos — order set by homeOrder (see page.tsx) */}
        <div className="mt-6 -mx-4 px-4 flex gap-3.5 overflow-x-auto no-scrollbar snap-x">
          {machines.map((m) => (
            <Link
              key={m.id}
              href={`/machines/${m.slug}`}
              className="group shrink-0 w-[160px] sm:w-[180px] snap-start rounded-2xl bg-white/[.04] border border-white/10 hover:border-[#E0973F]/60 overflow-hidden transition-colors"
            >
              <div className="relative aspect-square bg-[#FDFBF7] grid place-items-center overflow-hidden">
                {m.imageUrl ? (
                  <SmartImage src={m.imageUrl} alt={`${m.brand} ${m.modelNumber} — ${m.name}`} sizes="180px" fit="contain" className="transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <span className="text-5xl opacity-20">⚙️</span>
                )}
              </div>
              <div className="p-3">
                <p className="font-display font-semibold text-[15px] leading-snug">{m.brand} {m.modelNumber}</p>
                <p className="text-cream/55 text-[12px] leading-snug line-clamp-1 mt-0.5">{m.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
