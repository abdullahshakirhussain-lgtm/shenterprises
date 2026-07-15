import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";
import { getSetting } from "@/lib/settings";
import { normalizePhone } from "@/lib/userAuth";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Industrial Sewing & Embroidery Machines — Price Sri Lanka",
  description:
    "Authorised PRiME dealer in Sri Lanka. Single-needle lockstitch, overlock, flatlock, buttonhole, bartack & embroidery machines. Genuine warranty, island-wide delivery, in-house service. Call or WhatsApp for today's best price.",
};

const WA_ICON =
  "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.4-.7-2.9-1.1-4.7-4-4.8-4.2-.2-.2-1.2-1.5-1.2-2.9s.7-2 1-2.3c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.4l.9 2.1c.1.2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.4 2.5 1.5.3.2.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .7-.2 1.3z";
const TEL_ICON =
  "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z";

export default async function MachinesPage({ searchParams }: { searchParams: { type?: string } }) {
  const [machinesAll, sitePhoneRaw] = await Promise.all([
    prisma.machine.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } }),
    getSetting("site_phone"),
  ]);
  const phone = normalizePhone(sitePhoneRaw || "") || "";
  const phoneDisplay = (sitePhoneRaw || "").trim();
  const tel = phone ? `tel:+${phone}` : "tel:";
  const waBase = phone ? `https://wa.me/${phone}` : "https://wa.me/";
  const wa = (model?: string) =>
    `${waBase}?text=${encodeURIComponent(model ? `Hi, I'm interested in the PRiME ${model}. Please send the best price.` : "Hi, I'm interested in your industrial machines. Please share prices.")}`;

  // Browse-by-type: group active machines by category with counts.
  const typeMap = new Map<string, number>();
  for (const m of machinesAll) {
    const c = (m.category || "").trim();
    if (c) typeMap.set(c, (typeMap.get(c) || 0) + 1);
  }
  const types = [...typeMap.entries()].map(([name, count]) => ({ name, count }));

  const activeType = (searchParams.type || "").trim();
  const machines = activeType ? machinesAll.filter(m => (m.category || "") === activeType) : machinesAll;
  const gridHeading = activeType || "All machines";

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
          <div className="relative border-[1.5px] border-dashed border-[#D8CBB4] rounded-3xl p-3">
            <div className="aspect-[4/3] bg-white border border-[#E8E0D2] rounded-2xl overflow-hidden grid place-items-center">
              {machinesAll.find(m => m.imageUrl)?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={machinesAll.find(m => m.imageUrl)!.imageUrl!} alt="PRiME industrial sewing machine" className="w-full h-full object-contain" />
              ) : (
                <span className="text-7xl opacity-20">⚙️</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="max-w-[1200px] mx-auto px-5 mt-7">
        <div className="bg-white border border-[#E8E0D2] rounded-[20px] relative overflow-hidden grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[repeating-linear-gradient(90deg,#E0973F_0_12px,transparent_12px_26px)]" />
          {[
            { big: "27 yrs", small: "Supplying Sri Lankan tailors since 1998" },
            { big: "1-year", small: "Genuine warranty on every machine" },
            { big: "Island-wide", small: "Delivery in 2–4 working days" },
            { big: "In-house", small: "Technicians & spare parts in Colombo" },
          ].map((t, i) => (
            <div key={i} className="px-6 py-[22px] flex flex-col gap-1 border-r border-dashed border-[#E8E0D2] last:border-r-0">
              <span className="font-display font-semibold text-[28px] text-[#B9741F]">{t.big}</span>
              <span className="text-[13px] font-bold text-[#6E6459]">{t.small}</span>
            </div>
          ))}
        </div>
      </section>

      {/* BROWSE BY TYPE */}
      {types.length > 1 && (
        <section className="max-w-[1200px] mx-auto px-5 pt-16 pb-2.5">
          <div className="flex items-baseline justify-between gap-4 flex-wrap mb-[22px]">
            <div>
              <h2 className="font-display font-semibold text-[clamp(28px,3.4vw,38px)] tracking-[-.01em]">Browse by machine type</h2>
              <p className="text-[15px] font-semibold text-[#6E6459] mt-2">Not sure which type? Call us — we&apos;ll match the machine to your fabric and volume.</p>
            </div>
            <a href={tel} className="text-[14.5px] font-extrabold whitespace-nowrap text-[#B9741F] hover:text-[#96590E]">Ask an expert →</a>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5">
            {activeType && (
              <Link href="/machines" className="bg-[#1D1A16] text-[#FAF7F2] border border-[#1D1A16] rounded-[18px] p-[22px] flex flex-col gap-2.5 transition-transform hover:-translate-y-1">
                <span className="text-[17px] font-extrabold">← All types</span>
                <span className="text-[13.5px] font-semibold text-[#A99D8C] leading-[1.55]">Show every machine we stock.</span>
              </Link>
            )}
            {types.map((ty) => {
              const on = ty.name === activeType;
              return (
                <Link
                  key={ty.name}
                  href={on ? "/machines" : `/machines?type=${encodeURIComponent(ty.name)}`}
                  className={`rounded-[18px] p-[22px] flex flex-col gap-2.5 transition-transform hover:-translate-y-1 ${on ? "bg-[#FBF1E2] border border-[#EFD9B4]" : "bg-white border border-[#E8E0D2] hover:border-[#EFD9B4]"}`}
                >
                  <svg width="64" height="18" viewBox="0 0 64 18" fill="none" stroke="#E0973F" strokeWidth="2.4" strokeLinecap="round"><path d="M2 9h60" /></svg>
                  <span className="text-[17px] font-extrabold text-[#1D1A16]">{ty.name}</span>
                  <span className="mt-auto pt-2 text-[13px] font-extrabold text-[#B9741F] flex items-center gap-1.5">
                    {ty.count} model{ty.count === 1 ? "" : "s"} <span className="text-[15px]">→</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* MACHINES GRID */}
      <section className="max-w-[1200px] mx-auto px-5 pt-14 pb-2.5">
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-5.5">
          <h2 className="font-display font-semibold text-[clamp(28px,3.4vw,38px)] tracking-[-.01em]">{gridHeading}</h2>
          {activeType && <Link href="/machines" className="text-[14.5px] font-extrabold whitespace-nowrap text-[#B9741F] hover:text-[#96590E]">Clear filter →</Link>}
        </div>

        {machines.length === 0 ? (
          <p className="text-center text-[#6E6459] py-16 font-semibold">Machines are being added — call {phoneDisplay || "us"} and we&apos;ll help right away.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {machines.map((m) => (
              <div key={m.id} className="bg-white border border-[#E8E0D2] rounded-[18px] overflow-hidden flex flex-col transition-transform transition-shadow duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(29,26,22,.09)]">
                <Link href={`/machines/${m.slug}`} className="block aspect-[4/3] bg-[#FDFBF7] border-b border-[#F0EADD] grid place-items-center overflow-hidden">
                  {m.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.imageUrl} alt={`${m.brand} ${m.modelNumber} — ${m.name}`} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-5xl opacity-20">⚙️</span>
                  )}
                </Link>
                <div className="p-5 flex flex-col gap-1.5 flex-1">
                  {m.category && <span className="text-[11.5px] font-extrabold tracking-[.12em] uppercase text-[#B9741F]">{m.category}</span>}
                  <Link href={`/machines/${m.slug}`} className="font-display font-semibold text-[23px] text-[#1D1A16] tracking-[-.01em] hover:text-[#B9741F]">{m.brand} {m.modelNumber}</Link>
                  <span className="text-[13.5px] font-semibold text-[#6E6459] leading-[1.5]">{m.name}</span>
                  <span className="text-[15px] font-extrabold text-[#1D1A16] mt-1.5">{m.price != null ? formatLKR(m.price) : "Enquire for price"}</span>
                  <div className="grid grid-cols-[1fr_52px] gap-2 mt-2.5">
                    <Link href={`/machines/${m.slug}`} className="flex items-center justify-center min-h-[46px] bg-[#1D1A16] text-[#FAF7F2] font-extrabold text-sm rounded-[12px] transition-transform hover:-translate-y-0.5">Enquire</Link>
                    <a href={wa(m.modelNumber)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp enquiry for ${m.modelNumber}`} className="flex items-center justify-center min-h-[46px] bg-[#E9F7EF] border-[1.5px] border-[#BCE5CD] text-[#1F9D55] rounded-[12px] transition-transform hover:-translate-y-0.5">
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d={WA_ICON} /></svg>
                    </a>
                  </div>
                </div>
              </div>
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
