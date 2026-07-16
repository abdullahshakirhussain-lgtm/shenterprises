import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";
import { getSetting } from "@/lib/settings";
import { normalizePhone } from "@/lib/userAuth";
import { safeJsonLd } from "@/components/JsonLd";
import MachineContactButtons from "@/components/MachineContactButtons";
import MachineLeadForm from "@/components/MachineLeadForm";
import MachineCard, { WA_ICON, TEL_ICON } from "@/components/MachineCard";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Machine, MachineType } from "@prisma/client";

export const dynamic = "force-dynamic";

/*
 * /machines/[slug] resolves a MachineType hub FIRST, then falls back to a
 * machine detail page. Type slugs are curated ("embroidery-machines"); machine
 * slugs are house codes ("prime-pr-1204ct") — no realistic collision.
 *
 * SEO strategy (type-led, not model-number-led): buyers search machine TYPE +
 * intent ("embroidery machine price sri lanka"), not obscure house model
 * numbers. Hubs own the head terms; detail titles lead with the type phrase.
 */

function parseImages(v: string | null): string[] {
  if (!v) return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p.filter(Boolean) : []; } catch { return []; }
}
function parseSpecs(v: string | null): { key: string; value: string }[] {
  if (!v) return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
}
function parseEquivalents(v: string | null): { brand: string; model: string; note?: string }[] {
  if (!v) return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
}
function parseFaq(v: string | null): { q: string; a: string }[] {
  if (!v) return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
}

/** Type-led searchable title: "{name} Machine Price Sri Lanka | Brand Model". */
function machineTitle(m: { name: string; brand: string; modelNumber: string }): string {
  const phrase = /machine/i.test(m.name) ? m.name : `${m.name} Machine`;
  return `${phrase} Price Sri Lanka | ${m.brand} ${m.modelNumber}`;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  // Type hub metadata
  const type = await prisma.machineType.findUnique({ where: { slug: params.slug } });
  if (type) {
    const title = `${type.name} — Price Sri Lanka`;
    const desc = (
      type.seoIntro ||
      type.blurb ||
      `${type.name} in Sri Lanka from SH Enterprises — authorised PRiME dealer. Genuine warranty, island-wide delivery & in-house service. Call or WhatsApp for today's best price.`
    ).slice(0, 158);
    return {
      title,
      description: desc,
      openGraph: { title: `${title} | SH Enterprises`, description: desc, type: "website" },
    };
  }

  // Machine detail metadata — type phrase leads, model number follows.
  const m = await prisma.machine.findUnique({ where: { slug: params.slug } });
  if (!m) return { title: "Machine not found" };
  const title = machineTitle(m);
  const desc = (
    m.seoIntro ||
    `${m.brand} ${m.modelNumber} ${m.name} — industrial machine in Sri Lanka from SH Enterprises. Authorised dealer, warranty & island-wide service. Call or WhatsApp for today's best price.`
  ).slice(0, 158);
  return {
    title,
    description: desc,
    keywords: [
      `${m.brand} ${m.modelNumber}`,
      m.category || "",
      `${m.name} price Sri Lanka`,
      "industrial sewing machine Sri Lanka",
    ].filter(Boolean),
    openGraph: {
      title: `${title} | SH Enterprises`,
      description: desc,
      type: "website",
      images: m.imageUrl ? [m.imageUrl] : undefined,
    },
  };
}

export default async function MachineOrTypePage({ params }: { params: { slug: string } }) {
  const type = await prisma.machineType.findUnique({ where: { slug: params.slug } });
  if (type) return <TypeHub type={type} />;
  return <MachineDetail slug={params.slug} />;
}

/* =========================== TYPE HUB =========================== */

async function TypeHub({ type }: { type: MachineType }) {
  const [machines, sitePhoneRaw] = await Promise.all([
    prisma.machine.findMany({ where: { active: true, category: type.name }, orderBy: { createdAt: "desc" } }),
    getSetting("site_phone"),
  ]);
  const phone = normalizePhone(sitePhoneRaw || "") || "";
  const phoneDisplay = (sitePhoneRaw || "").trim();
  const tel = phone ? `tel:+${phone}` : "tel:";
  const waBase = phone ? `https://wa.me/${phone}` : "https://wa.me/";
  const wa = (model?: string) =>
    `${waBase}?text=${encodeURIComponent(model ? `Hi, I'm interested in the PRiME ${model}. Please send the best price.` : `Hi, I'm looking for a ${type.name.toLowerCase().replace(/s$/, "")}. Please share prices.`)}`;
  const faq = parseFaq(type.faq);
  const siteUrl = process.env.SITE_URL || "https://shenterprises.lk";

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Machines", item: `${siteUrl}/machines` },
      { "@type": "ListItem", position: 3, name: type.name, item: `${siteUrl}/machines/${type.slug}` },
    ],
  };
  const itemListLd = machines.length ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${type.name} — Sri Lanka`,
    itemListElement: machines.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${m.brand} ${m.modelNumber} ${m.name}`,
      url: `${siteUrl}/machines/${m.slug}`,
    })),
  } : null;
  const faqLd = faq.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  } : null;

  return (
    <div className="bg-[#FAF7F2] text-[#1D1A16] font-sans pb-24 md:pb-0" style={{ overflowX: "clip" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      {itemListLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListLd) }} />}
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }} />}

      {/* Masthead strand */}
      <div className="max-w-[1200px] mx-auto px-5 pt-6 flex items-baseline justify-between gap-4">
        <Link href="/machines" className="text-[11.5px] font-extrabold tracking-[.22em] uppercase text-[#8A7E6E] hover:text-[#B9741F]">
          ← All industrial machines
        </Link>
        {phoneDisplay && (
          <a href={tel} className="font-display text-[17px] font-medium text-[#1D1A16] whitespace-nowrap hover:text-[#B9741F]">{phoneDisplay}</a>
        )}
      </div>
      <div className="max-w-[1200px] mx-auto px-5 mt-3.5">
        <div className="h-px bg-[repeating-linear-gradient(90deg,#CBBFA9_0_9px,transparent_9px_20px)]" />
      </div>

      {/* Header + SEO intro */}
      <section className="max-w-[1200px] mx-auto px-5 pt-10 pb-2">
        <div className="inline-flex items-center gap-2.5 bg-[#FBF1E2] border border-[#EFD9B4] rounded-full px-4 py-1.5 text-[12.5px] font-extrabold tracking-[.08em] uppercase text-[#96590E]">
          <span className="w-[7px] h-[7px] rounded-full bg-[#E0973F]" />
          Authorised PRiME dealer · Sri Lanka
        </div>
        <h1 className="font-display font-semibold text-[clamp(34px,4.6vw,54px)] leading-[1.06] tracking-[-.02em] mt-4 mb-4">
          {type.name} — <span className="italic text-[#B9741F]">Price Sri Lanka</span>
        </h1>
        {type.seoIntro && (
          <p className="text-[16.5px] leading-[1.7] text-[#4A4238] max-w-[75ch] whitespace-pre-line">{type.seoIntro}</p>
        )}
        <div className="flex flex-wrap gap-3 mt-6">
          <a href={tel} className="flex items-center justify-center gap-2.5 min-h-[54px] px-6 bg-[#E0973F] text-[#1D1A16] font-extrabold text-base rounded-[14px] transition-transform hover:-translate-y-0.5">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d={TEL_ICON} /></svg>
            Call {phoneDisplay || "us"}
          </a>
          <a href={wa()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 min-h-[54px] px-6 bg-[#1F9D55] text-white font-extrabold text-base rounded-[14px] transition-transform hover:-translate-y-0.5">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d={WA_ICON} /></svg>
            WhatsApp us
          </a>
        </div>
      </section>

      {/* Machines of this type */}
      <section className="max-w-[1200px] mx-auto px-5 pt-10 pb-2.5">
        {machines.length === 0 ? (
          <p className="text-[#6E6459] py-12 font-semibold">
            New stock arriving — call {phoneDisplay || "us"} and we&apos;ll help right away.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {machines.map(m => (
              <MachineCard
                key={m.id}
                m={{ id: m.id, slug: m.slug, brand: m.brand, modelNumber: m.modelNumber, name: m.name, category: m.category, price: m.price, imageUrl: m.imageUrl }}
                waHref={wa(m.modelNumber)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Buyer FAQ */}
      {faq.length > 0 && (
        <section className="max-w-[1200px] mx-auto px-5 pt-12">
          <div className="flex flex-wrap gap-[clamp(28px,5vw,72px)]">
            <div className="flex-[0_1_280px] min-w-[240px]">
              <h2 className="font-display font-normal text-[clamp(28px,3.6vw,40px)] tracking-[-.02em] leading-[1.05]">Buying guide.</h2>
              <p className="text-[14.5px] font-semibold leading-[1.7] text-[#6E6459] mt-4">What buyers ask us before choosing — honest answers.</p>
            </div>
            <div className="flex-[1.6_1_440px] min-w-0">
              {faq.map((f, i) => (
                <details key={i} className="border-b border-[#EAE2D3] py-4 group">
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-display text-[19px] font-medium text-[#1D1A16]">
                    {f.q}
                    <span className="text-[#B9741F] text-2xl leading-none group-open:rotate-45 transition-transform shrink-0">+</span>
                  </summary>
                  <p className="text-[15px] leading-[1.75] text-[#4A4238] mt-3 whitespace-pre-line">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA band */}
      <section className="max-w-[1200px] mx-auto px-5 pt-14 pb-[72px]">
        <div className="bg-[#1D1A16] rounded-3xl p-[clamp(30px,5vw,52px)] relative overflow-hidden flex flex-wrap gap-[26px] items-center justify-between">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[repeating-linear-gradient(90deg,#E0973F_0_12px,transparent_12px_26px)]" />
          <div className="max-w-[56ch]">
            <h2 className="font-display font-semibold text-[clamp(26px,3.4vw,38px)] tracking-[-.01em] text-[#FAF7F2]">Tell us your fabric. We&apos;ll tell you the machine — and the price.</h2>
            <p className="text-[15px] font-semibold leading-[1.65] text-[#A99D8C] mt-3">One phone call saves weeks of research. Honest advice, today&apos;s best price, demo in Colombo or by WhatsApp video.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={tel} className="flex items-center justify-center min-h-[54px] px-6 bg-[#E0973F] text-[#1D1A16] font-extrabold text-base rounded-[14px] transition-transform hover:-translate-y-0.5">Call {phoneDisplay || "us"}</a>
            <a href={wa()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center min-h-[54px] px-6 bg-transparent border-[1.5px] border-[#4A443B] text-[#EDE6DA] font-extrabold text-base rounded-[14px] transition-transform hover:-translate-y-0.5 hover:border-[#1F9D55]">WhatsApp</a>
          </div>
        </div>
      </section>

      {/* Sticky mobile contact bar */}
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

/* ========================= MACHINE DETAIL ========================= */

async function MachineDetail({ slug }: { slug: string }) {
  const m: Machine | null = await prisma.machine.findUnique({ where: { slug } });
  if (!m || !m.active) notFound();

  const [sitePhoneRaw, machineType] = await Promise.all([
    getSetting("site_phone"),
    m.category ? prisma.machineType.findUnique({ where: { name: m.category } }) : Promise.resolve(null),
  ]);
  const siteUrl = process.env.SITE_URL || "https://shenterprises.lk";
  const phone = normalizePhone(sitePhoneRaw || "") || "";
  const phoneDisplay = (sitePhoneRaw || "").trim();
  const gallery = [m.imageUrl, ...parseImages(m.images)].filter(Boolean) as string[];
  const specs = parseSpecs(m.specs);
  const equivalents = parseEquivalents(m.equivalents);
  const faq = parseFaq(m.faq);

  // JSON-LD Product — brand + model + offer + equivalents as additionalProperty
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${m.brand} ${m.modelNumber} ${m.name}`,
    sku: m.modelNumber,
    mpn: m.modelNumber,
    brand: { "@type": "Brand", name: m.brand },
    ...(m.imageUrl ? { image: gallery } : {}),
    ...((m.seoIntro || m.description) ? { description: m.seoIntro || m.description } : {}),
    category: m.category || "Industrial Sewing Machine",
    ...(equivalents.length ? {
      additionalProperty: equivalents.map(e => ({
        "@type": "PropertyValue",
        name: "Equivalent model",
        value: `${e.brand} ${e.model}`,
      })),
    } : {}),
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/machines/${m.slug}`,
      priceCurrency: "LKR",
      ...(m.price != null ? { price: m.price.toFixed(2) } : {}),
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "SH Enterprises" },
    },
  };

  // Breadcrumb gains the type level when the machine belongs to a type hub.
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Machines", item: `${siteUrl}/machines` },
      ...(machineType ? [{ "@type": "ListItem", position: 3, name: machineType.name, item: `${siteUrl}/machines/${machineType.slug}` }] : []),
      { "@type": "ListItem", position: machineType ? 4 : 3, name: `${m.brand} ${m.modelNumber}`, item: `${siteUrl}/machines/${m.slug}` },
    ],
  };
  const faqLd = faq.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  const hasPrice = m.price != null;
  const priceLabel = hasPrice ? formatLKR(m.price as number) : "Enquire for price";
  const priceSub = hasPrice
    ? "Quoted complete — motor, table and stand included where applicable. Delivery and installation priced by district."
    : "Machine prices move with exchange rates, so we quote by phone — always today's best figure, complete with motor, table and stand.";
  const heroImage = gallery[0];

  return (
    <div className="bg-[#FAF7F2] text-[#1D1A16] font-sans min-h-screen pb-24 md:pb-0" style={{ overflowX: "clip" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(productLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }} />}

      {/* Masthead strand — back-link goes to the type hub when there is one */}
      <div className="max-w-[1140px] mx-auto px-6 pt-6 flex items-baseline justify-between gap-4">
        <Link
          href={machineType ? `/machines/${machineType.slug}` : "/machines"}
          className="text-[11.5px] font-extrabold tracking-[.22em] uppercase text-[#8A7E6E] hover:text-[#B9741F]"
        >
          ← {machineType ? machineType.name : "SH Enterprises · Industrial Machines"}
        </Link>
        {phoneDisplay && (
          <a href={`tel:+${phone}`} className="font-display text-[17px] font-medium text-[#1D1A16] whitespace-nowrap hover:text-[#B9741F]">{phoneDisplay}</a>
        )}
      </div>
      <div className="max-w-[1140px] mx-auto px-6 mt-3.5">
        <div className="h-px bg-[repeating-linear-gradient(90deg,#CBBFA9_0_9px,transparent_9px_20px)]" />
      </div>

      {/* HERO — editorial spread */}
      <section className="max-w-[1140px] mx-auto px-6 pt-[clamp(36px,6vw,72px)]">
        <div className="flex flex-wrap gap-[clamp(28px,5vw,64px)] items-end">
          <div className="flex-[1.1_1_400px] min-w-0">
            <div className="flex items-baseline gap-3.5">
              <span className="font-display italic text-[19px] text-[#B9741F]">№ 01</span>
              <span className="text-[11.5px] font-extrabold tracking-[.2em] uppercase text-[#8A7E6E]">{m.brand}{m.category ? ` · ${m.category}` : ""}</span>
            </div>
            <h1 className="font-display font-normal text-[clamp(40px,8vw,92px)] leading-[.96] tracking-[-.03em] mt-3.5">
              {m.brand} <span className="text-[#B9741F]">{m.modelNumber}</span>
            </h1>
            <p className="font-display italic font-light text-[clamp(20px,2.6vw,26px)] leading-[1.35] text-[#4A4238] mt-5 max-w-[26ch]">{m.name}</p>
            {(m.description || m.seoIntro) && (
              <p className="text-[15.5px] leading-[1.75] text-[#4A4238] mt-5 max-w-[52ch] whitespace-pre-line">{m.description || m.seoIntro}</p>
            )}
          </div>

          {/* Single photograph, museum plate */}
          <div className="flex-[1_1_400px] min-w-0">
            <div className="relative p-2.5 bg-white border border-[#E4DAC8] shadow-[0_24px_60px_-30px_rgba(29,26,22,.25)]">
              <div className="aspect-[4/3] bg-[#FDFBF7] overflow-hidden grid place-items-center">
                {heroImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={heroImage} alt={`${m.brand} ${m.modelNumber} industrial sewing machine`} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-6xl opacity-20">⚙️</span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-baseline mt-3 px-1">
              <span className="font-display italic text-[14.5px] text-[#6E6459]">PRiME {m.modelNumber}, photographed on white.</span>
              <span className="text-[11px] font-extrabold tracking-[.16em] uppercase text-[#96590E]">In stock — Colombo</span>
            </div>
          </div>
        </div>
      </section>

      {/* PRICE — typographic, not a card */}
      <section className="max-w-[1140px] mx-auto px-6 pt-[clamp(44px,7vw,84px)]">
        <div className="flex flex-wrap gap-[clamp(28px,5vw,72px)] items-center border-y border-[#E4DAC8] py-[clamp(28px,4vw,44px)]">
          <div className="flex-[1.2_1_340px] min-w-0">
            <span className="text-[11.5px] font-extrabold tracking-[.2em] uppercase text-[#8A7E6E]">The price</span>
            <div className="font-display font-normal text-[clamp(32px,5vw,54px)] tracking-[-.02em] leading-[1.1] mt-2.5">
              {priceLabel}<span className="font-display italic font-light text-[#B9741F]">*</span>
            </div>
            <p className="text-sm font-semibold leading-[1.65] text-[#6E6459] mt-3.5 max-w-[48ch]">
              <span className="font-display italic text-[#B9741F] text-base">*</span> {priceSub}
            </p>
          </div>
          <div className="flex-[1_1_320px] min-w-0">
            <MachineContactButtons
              phone={phone}
              phoneDisplay={phoneDisplay}
              brand={m.brand}
              modelNumber={m.modelNumber}
              machineId={m.id}
              machineName={m.name}
            />
          </div>
        </div>
      </section>

      {/* SPECIFICATIONS — ledger style */}
      {specs.length > 0 && (
        <section className="max-w-[1140px] mx-auto px-6 pt-[clamp(52px,8vw,96px)]">
          <div className="flex flex-wrap gap-[clamp(28px,5vw,72px)]">
            <div className="flex-[0_1_280px] min-w-[240px]">
              <span className="font-display italic text-[19px] text-[#B9741F]">№ 02</span>
              <h2 className="font-display font-normal text-[clamp(30px,4vw,44px)] tracking-[-.02em] leading-[1.05] mt-2.5">The specifications, plainly.</h2>
              <p className="text-[14.5px] font-semibold leading-[1.7] text-[#6E6459] mt-4">No marketing numbers — the sheet our own technicians work from.</p>
            </div>
            <div className="flex-[1.6_1_440px] min-w-0">
              {specs.map((s, i) => (
                <div key={i} className="flex items-baseline gap-4 py-3 border-b border-[#EAE2D3]">
                  <span className="basis-[42%] shrink-0 text-xs font-extrabold tracking-[.1em] uppercase text-[#8A7E6E]">{s.key}</span>
                  <span className="flex-1 h-px self-center bg-[repeating-linear-gradient(90deg,#DDD2BE_0_4px,transparent_4px_10px)]" />
                  <span className="font-display text-[17px] font-medium text-[#1D1A16] text-right">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CROSS-BRAND EQUIVALENTS — kept only when genuine; out of titles/meta */}
      {equivalents.length > 0 && (
        <section className="max-w-[1140px] mx-auto px-6 pt-[clamp(52px,8vw,96px)]">
          <div className="flex flex-wrap gap-[clamp(28px,5vw,72px)]">
            <div className="flex-[0_1_280px] min-w-[240px]">
              <span className="font-display italic text-[19px] text-[#B9741F]">№ 03</span>
              <h2 className="font-display font-normal text-[clamp(30px,4vw,44px)] tracking-[-.02em] leading-[1.05] mt-2.5">Also known as.</h2>
              <p className="text-[14.5px] font-semibold leading-[1.7] text-[#6E6459] mt-4">
                The {m.brand} {m.modelNumber} is the same machine class as these. If you run one of them, this is your drop-in replacement.
              </p>
            </div>
            <div className="flex-[1.6_1_440px] min-w-0">
              {equivalents.map((e, i) => (
                <div key={i} className="flex items-baseline gap-4 py-3 border-b border-[#EAE2D3]">
                  <span className="text-[#B9741F]">↔</span>
                  <span className="font-display text-[17px] font-medium">{e.brand} {e.model}</span>
                  {e.note && <span className="text-[13px] text-[#8A7E6E] ml-auto text-right">{e.note}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ — visible + FAQPage rich snippet */}
      {faq.length > 0 && (
        <section className="max-w-[1140px] mx-auto px-6 pt-[clamp(52px,8vw,96px)]">
          <div className="flex flex-wrap gap-[clamp(28px,5vw,72px)]">
            <div className="flex-[0_1_280px] min-w-[240px]">
              <span className="font-display italic text-[19px] text-[#B9741F]">№ 04</span>
              <h2 className="font-display font-normal text-[clamp(30px,4vw,44px)] tracking-[-.02em] leading-[1.05] mt-2.5">Questions, answered.</h2>
            </div>
            <div className="flex-[1.6_1_440px] min-w-0">
              {faq.map((f, i) => (
                <details key={i} className="border-b border-[#EAE2D3] py-4 group">
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-display text-[19px] font-medium text-[#1D1A16]">
                    {f.q}
                    <span className="text-[#B9741F] text-2xl leading-none group-open:rotate-45 transition-transform shrink-0">+</span>
                  </summary>
                  <p className="text-[15px] leading-[1.75] text-[#4A4238] mt-3 whitespace-pre-line">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LEAD FORM — letterpress note */}
      <section id="lead-form" className="max-w-[1140px] mx-auto px-6 pt-[clamp(52px,8vw,96px)] pb-[clamp(64px,9vw,110px)]">
        <div className="border-[1.5px] border-[#1D1A16] bg-white relative">
          <div className="absolute inset-2 border border-dashed border-[#D8CBB4] pointer-events-none" />
          <div className="relative p-[clamp(30px,5vw,56px)] flex flex-wrap gap-[clamp(28px,5vw,64px)]">
            <div className="flex-[1_1_320px] min-w-0">
              <span className="font-display italic text-[19px] text-[#B9741F]">№ 05</span>
              <h2 className="font-display font-normal text-[clamp(30px,4vw,44px)] tracking-[-.02em] leading-[1.08] mt-2.5">
                Leave your number.<br /><span className="italic font-light text-[#B9741F]">We&apos;ll do the calling.</span>
              </h2>
              <p className="text-[14.5px] font-semibold leading-[1.7] text-[#6E6459] mt-4 max-w-[42ch]">
                Today&apos;s best price for the {m.brand} {m.modelNumber}, by phone or straight to your WhatsApp — within one working hour. One call, no spam.
              </p>
              {m.warrantyInfo && (
                <p className="text-[13px] text-[#8A7E6E] mt-4 pt-4 border-t border-[#EAE2D3] max-w-[42ch]">{m.warrantyInfo}</p>
              )}
            </div>
            <div className="flex-[1.3_1_380px] min-w-0">
              <MachineLeadForm machineId={m.id} modelNumber={m.modelNumber} brand={m.brand} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
