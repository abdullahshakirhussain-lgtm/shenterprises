import Link from "next/link";
import { WA_ICON, TEL_ICON } from "@/components/MachineCard";

/**
 * Homepage "Industrial Machines" band — a deliberately dark editorial section
 * (the machines-section identity) that pops against the cream accessory
 * storefront so the high-value machines line stops blending in. Photo-driven:
 * one flagship machine per type + type chips + Browse/Call/WhatsApp CTAs.
 * Server component, CSS-only motion.
 */

export type ShowcaseMachine = {
  id: number; slug: string; brand: string; modelNumber: string; name: string; category: string | null; imageUrl: string | null;
};
export type ShowcaseType = { name: string; slug: string; count: number };

export default function MachinesShowcase({
  machines, types, phone, phoneDisplay,
}: {
  machines: ShowcaseMachine[];
  types: ShowcaseType[];
  phone: string;
  phoneDisplay: string;
}) {
  if (machines.length === 0) return null;
  const tel = phone ? `tel:+${phone}` : "tel:";
  const waHref = `${phone ? `https://wa.me/${phone}` : "https://wa.me/"}?text=${encodeURIComponent("Hi, I'm interested in your industrial machines. Please share prices.")}`;

  return (
    <section className="bg-[#1D1A16] text-cream relative overflow-hidden">
      {/* Saffron stitched top accent — the machines-section signature */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[repeating-linear-gradient(90deg,#E0973F_0_12px,transparent_12px_26px)]" />

      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        {/* Header + CTAs */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#F5C97F]">
              <span className="w-[6px] h-[6px] rounded-full bg-[#E0973F]" />
              Authorised PRiME dealer · Sri Lanka
            </p>
            <h2 className="font-display font-semibold text-3xl sm:text-4xl md:text-5xl leading-[1.05] mt-3">
              Industrial sewing &amp; <span className="italic text-[#E0973F]">embroidery machines</span>
            </h2>
            <p className="text-cream/70 mt-3 max-w-xl">
              A different business from our threads &amp; trims — genuine warranty, island-wide delivery, and our own technicians in Colombo. Enquiry only; we quote today&apos;s best price by phone or WhatsApp.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Link href="/machines" className="inline-flex items-center gap-2 rounded-xl bg-[#E0973F] hover:bg-[#cf8836] text-[#1D1A16] font-bold px-5 py-3 transition-colors">
              Browse all machines <span className="font-display italic font-light">→</span>
            </Link>
            <a href={tel} className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-cream font-bold px-4 py-3 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d={TEL_ICON} /></svg>
              {phoneDisplay || "Call"}
            </a>
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#1F9D55] hover:bg-[#1b8b4b] text-white font-bold px-4 py-3 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={WA_ICON} /></svg>
              WhatsApp
            </a>
          </div>
        </div>

        {/* Featured machine photo scroller — one flagship per type */}
        <div className="mt-8 -mx-4 px-4 flex gap-3.5 overflow-x-auto no-scrollbar snap-x">
          {machines.map((m) => (
            <Link
              key={m.id}
              href={`/machines/${m.slug}`}
              className="group shrink-0 w-[190px] sm:w-[210px] snap-start rounded-2xl bg-white/[.04] border border-white/10 hover:border-[#E0973F]/60 overflow-hidden transition-colors"
            >
              <div className="aspect-square bg-[#FDFBF7] grid place-items-center overflow-hidden">
                {m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imageUrl} alt={`${m.brand} ${m.modelNumber} — ${m.name}`} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <span className="text-5xl opacity-20">⚙️</span>
                )}
              </div>
              <div className="p-3.5">
                {m.category && <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#F5C97F] truncate">{m.category}</p>}
                <p className="font-display font-semibold text-[17px] mt-0.5 leading-snug">{m.brand} {m.modelNumber}</p>
                <p className="text-cream/55 text-[13px] leading-snug line-clamp-2 mt-0.5">{m.name}</p>
                <span className="inline-block mt-2 text-[12px] font-bold text-[#E0973F]">Enquire →</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Type chips — every SEO hub, an entry point each */}
        {types.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {types.map((t) => (
              <Link
                key={t.slug}
                href={`/machines/${t.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[.04] hover:bg-white/10 hover:border-white/30 text-cream/85 text-[13px] font-semibold px-3 py-1.5 transition-colors"
              >
                {t.name}
                <span className="text-cream/40 text-[11px]">{t.count}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
