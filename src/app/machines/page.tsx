import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { normalizePhone } from "@/lib/userAuth";
import MachineCard, { WA_ICON, TEL_ICON } from "@/components/MachineCard";
import MachineHeroSlideshow from "@/components/MachineHeroSlideshow";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Industrial Sewing & Embroidery Machines — Price Sri Lanka",
  description:
    "Authorised PRiME dealer in Sri Lanka. Single-needle lockstitch, overlock, flatlock, buttonhole, bartack & embroidery machines. Genuine warranty, island-wide delivery, in-house service. Call or WhatsApp for today's best price.",
  // Canonical strips ?type= so the filtered variants fold into /machines.
  alternates: { canonical: "/machines" },
};

export default async function MachinesPage({ searchParams }: { searchParams: { type?: string } }) {
  const [machinesAll, machineTypes, sitePhoneRaw] = await Promise.all([
    prisma.machine.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } }),
    prisma.machineType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    getSetting("site_phone"),
  ]);
  const phone = normalizePhone(sitePhoneRaw || "") || "";
  const phoneDisplay = (sitePhoneRaw || "").trim();
  const tel = phone ? `tel:+${phone}` : "tel:";
  const waBase = phone ? `https://wa.me/${phone}` : "https://wa.me/";
  const wa = (model?: string) =>
    `${waBase}?text=${encodeURIComponent(model ? `Hi, I'm interested in the PRiME ${model}. Please send the best price.` : "Hi, I'm interested in your industrial machines. Please share prices.")}`;

  // Browse-by-type: admin-managed MachineTypes (each has its own SEO hub page
  // at /machines/{slug}) with live counts from the machines' category strings.
  const countByName = new Map<string, number>();
  for (const m of machinesAll) {
    const c = (m.category || "").trim();
    if (c) countByName.set(c, (countByName.get(c) || 0) + 1);
  }
  const types = machineTypes.map(t => ({ ...t, count: countByName.get(t.name) || 0 }));

  // ?type= keeps working as a plain filter (used for legacy/uncategorised).
  const activeType = (searchParams.type || "").trim();
  const machines = activeType ? machinesAll.filter(m => (m.category || "") === activeType) : machinesAll;
  const gridHeading = activeType || "All machines";

  // Hero slideshow — pinned (homeOrder) machines first, then newest. Each slide
  // links to its own machine page.
  const heroSlides = machinesAll
    .filter(m => m.imageUrl)
    .slice()
    .sort((a, b) => (a.homeOrder ?? 9999) - (b.homeOrder ?? 9999))
    .slice(0, 6)
    .map(m => ({ slug: m.slug, imageUrl: m.imageUrl!, brand: m.brand, modelNumber: m.modelNumber, name: m.name }));

  return (
    <div className="bg-[#FAF7F2] text-[#1D1A16] font-sans pb-24 md:pb-0" style={{ overflowX: "clip" }}>
      {/* HERO */}
      <section className="max-w-[1200px] mx-auto px-5 pt-12 pb-8 flex flex-wrap gap-11 items-center">
        <div className="flex-[1.1_1_420px] min-w-0">
          <div className="inline-flex items-center gap-2.5 bg-[#FBF1E2] border border-[#EFD9B4] rounded-full px-4 py-1.5 text-[12.5px] font-extrabold tracking-[.08em] uppercase text-[#96590E]">
            <span className="w-[7px] h-[7px] rounded-full bg-[#E0973F]" />
            Authorised PRiME dealer · Sri Lanka
          </div>
          <h1 className="font-display font-semibold text-[clamp(36px,5vw,58px)] leading-[1.06] tracking-[-.02em] mt-[18px] mb-4">
            Industrial sewing &amp; embroidery machines, <span className="italic text-[#B9741F]">island-wide.</span>
          </h1>
          <p className="text-[17px] leading-[1.65] text-[#4A4238] mb-6 max-w-[50ch]">
            Genuine warranty. Expert support. Every machine delivered with the table assembled, threaded and test-run — backed by our own service technicians in Colombo.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={tel} className="flex items-center justify-center gap-2.5 min-h-[54px] px-6 bg-[#E0973F] text-[#1D1A16] font-extrabold text-base rounded-[14px] transition-transform hover:-translate-y-0.5">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d={TEL_ICON} /></svg>
              Call {phoneDisplay || "us"}
            </a>
            <a href={wa()} className="flex items-center justify-center gap-2 min-h-[54px] px-6 bg-[#1F9D55] text-white font-extrabold text-base rounded-[14px] transition-transform hover:-translate-y-0.5">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d={WA_ICON} /></svg>
              WhatsApp us
            </a>
          </div>
          <div className="flex items-center gap-2 mt-4 text-[13.5px] font-semibold text-[#6E6459]">
            <span className="w-2 h-2 rounded-full bg-[#1F9D55] animate-pulse" />
            Open now · replies within the hour, Mon–Sat 9.00–18.00
          </div>
        </div>
        <div className="flex-[1_1_380px] min-w-0">
          {heroSlides.length > 0 ? (
            <MachineHeroSlideshow slides={heroSlides} />
          ) : (
            <div className="relative border-[1.5px] border-dashed border-[#D8CBB4] rounded-3xl p-3">
              <div className="aspect-[4/3] bg-white border border-[#E8E0D2] rounded-2xl grid place-items-center">
                <span className="text-7xl opacity-20">⚙️</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* BROWSE BY TYPE — compact chip row; each links to its SEO hub page */}
      {types.length > 0 && (
        <section className="max-w-[1200px] mx-auto px-5 pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-extrabold uppercase tracking-[.12em] text-[#8A7E6E] mr-1">Browse by type</span>
            {types.map((ty) => (
              <Link
                key={ty.id}
                href={`/machines/${ty.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E4DAC8] bg-white hover:border-[#E0973F] hover:bg-[#FBF1E2] text-[#1D1A16] text-[13.5px] font-semibold px-3.5 py-1.5 transition-colors"
              >
                {ty.name}
                <span className="text-[#B9741F] text-[11px] font-extrabold">{ty.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* MACHINES GRID */}
      <section className="max-w-[1200px] mx-auto px-5 pt-14 pb-2.5">
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-[22px]">
          <h2 className="font-display font-semibold text-[clamp(28px,3.4vw,38px)] tracking-[-.01em]">{gridHeading}</h2>
          {activeType && <Link href="/machines" className="text-[14.5px] font-extrabold whitespace-nowrap text-[#B9741F] hover:text-[#96590E]">Clear filter →</Link>}
        </div>

        {machines.length === 0 ? (
          <p className="text-center text-[#6E6459] py-16 font-semibold">Machines are being added — call {phoneDisplay || "us"} and we&apos;ll help right away.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {machines.map((m) => (
              <MachineCard
                key={m.id}
                m={{ id: m.id, slug: m.slug, brand: m.brand, modelNumber: m.modelNumber, name: m.name, category: m.category, price: m.price, imageUrl: m.imageUrl }}
                waHref={wa(m.modelNumber)}
              />
            ))}
          </div>
        )}
      </section>

      {/* CTA BAND */}
      <section className="max-w-[1200px] mx-auto px-5 pt-16 pb-[72px]">
        <div className="bg-[#1D1A16] rounded-3xl p-[clamp(30px,5vw,52px)] relative overflow-hidden flex flex-wrap gap-[26px] items-center justify-between">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[repeating-linear-gradient(90deg,#E0973F_0_12px,transparent_12px_26px)]" />
          <div className="max-w-[56ch]">
            <h2 className="font-display font-semibold text-[clamp(26px,3.4vw,38px)] tracking-[-.01em] text-[#FAF7F2]">Tell us your fabric. We&apos;ll tell you the machine — and the price.</h2>
            <p className="text-[15px] font-semibold leading-[1.65] text-[#A99D8C] mt-3">One phone call saves weeks of research. Honest advice, today&apos;s best price, demo in Colombo or by WhatsApp video.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={tel} className="flex items-center justify-center min-h-[54px] px-6 bg-[#E0973F] text-[#1D1A16] font-extrabold text-base rounded-[14px] transition-transform hover:-translate-y-0.5">Call {phoneDisplay || "us"}</a>
            <a href={wa()} className="flex items-center justify-center min-h-[54px] px-6 bg-transparent border-[1.5px] border-[#4A443B] text-[#EDE6DA] font-extrabold text-base rounded-[14px] transition-transform hover:-translate-y-0.5 hover:border-[#1F9D55]">WhatsApp</a>
          </div>
        </div>
      </section>

      {/* STICKY MOBILE CONTACT BAR */}
      <div className="md:hidden fixed left-0 right-0 bottom-0 z-[60] bg-white/95 backdrop-blur border-t border-[#E8E0D2] px-3 pt-2.5 grid grid-cols-2 gap-2"
        style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
      >
        <a href={tel} className="flex items-center justify-center gap-1.5 min-h-[48px] bg-[#1D1A16] text-[#FAF7F2] font-extrabold text-sm rounded-[12px]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d={TEL_ICON} /></svg>
          Call now
        </a>
        <a href={wa()} className="flex items-center justify-center gap-1.5 min-h-[48px] bg-[#1F9D55] text-white font-extrabold text-sm rounded-[12px]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d={WA_ICON} /></svg>
          WhatsApp
        </a>
      </div>
    </div>
  );
}
