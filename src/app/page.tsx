import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { memo } from "@/lib/memo";
import EditorialHero from "@/components/EditorialHero";
import BannerStrip from "@/components/BannerStrip";
import PromoStrip from "@/components/PromoStrip";
import MachinesShowcase from "@/components/MachinesShowcase";
import ProductCard from "@/components/ProductCard";
import JsonLd, { organizationSchema, websiteSchema, localBusinessSchema } from "@/components/JsonLd";
import { fetchOfferProducts } from "@/lib/offers";
import { getSetting } from "@/lib/settings";
import { normalizePhone } from "@/lib/userAuth";
import type { Metadata } from "next";
import { langAlternates } from "@/lib/seoLang";

export const dynamic = "force-dynamic";

// Self-referencing canonical so UTM/ref-tagged homepage URLs (e.g. /?utm_source=…)
// don't register as duplicates. Resolved to absolute via metadataBase (layout).
export async function generateMetadata(): Promise<Metadata> {
  return { alternates: await langAlternates("/") };
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); }
  catch (e) {
    console.warn("[home] data fetch failed, using fallback:", (e as any)?.message);
    return fallback;
  }
}

export default async function HomePage() {
  const [banners, offers, allActiveIds, promoText, heroProducts, machineTypes, machinesWithImg, sitePhoneRaw] = await Promise.all([
    safe(() => memo("home:banners", () => prisma.banner.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } })), [] as any[]),
    // Genuine sale price OR flagged on-offer — same rule as the /offers page
    safe(() => memo("home:offers", () => fetchOfferProducts(8)), [] as any[]),
    safe(() => memo("home:ids", () => prisma.product.findMany({ where: { active: true }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 12, select: { id: true } })), [] as { id: number }[]),
    safe(() => getSetting("promo_strip_text"), null),
    // Featured products for hero collage — prefer featured > on-offer > any with an image
    safe(() => memo("home:hero", () => prisma.product.findMany({
      where: { active: true, imageUrl: { not: null } },
      orderBy: [{ featured: "desc" }, { onOffer: "desc" }, { updatedAt: "desc" }],
      take: 3,
      select: { name: true, slug: true, imageUrl: true },
    })), [] as any[]),
    // Machines showcase: type hubs (ordered) + all machines with photos
    safe(() => memo("machineTypes", () => prisma.machineType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })), [] as any[]),
    safe(() => memo("home:machines", () => prisma.machine.findMany({
      where: { active: true, imageUrl: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { id: true, slug: true, brand: true, modelNumber: true, name: true, category: true, imageUrl: true, homeOrder: true },
    })), [] as any[]),
    safe(() => getSetting("site_phone"), null),
  ]);

  // Homepage feature strip ordering:
  //  1) Machines with a `homeOrder` set are PINNED to the front, ascending.
  //  2) Remaining slots auto-fill with one machine per type (variety), then any
  //     leftover newest machines — capped so the strip stays compact.
  const FEATURE_CAP = 12;
  const seen = new Set<number>();
  const featuredMachines: any[] = [];
  for (const m of [...machinesWithImg].filter((m: any) => m.homeOrder != null).sort((a: any, b: any) => a.homeOrder - b.homeOrder)) {
    if (!seen.has(m.id)) { featuredMachines.push(m); seen.add(m.id); }
  }
  for (const t of machineTypes) {
    if (featuredMachines.length >= FEATURE_CAP) break;
    const rep = machinesWithImg.find((m: any) => m.category === t.name && !seen.has(m.id));
    if (rep) { featuredMachines.push(rep); seen.add(rep.id); }
  }
  for (const m of machinesWithImg) {
    if (featuredMachines.length >= FEATURE_CAP) break;
    if (!seen.has(m.id)) { featuredMachines.push(m); seen.add(m.id); }
  }
  const machinePhone = normalizePhone(sitePhoneRaw || "") || "";

  const sampleIds = allActiveIds.length
    ? allActiveIds.map(p => p.id)
    : [];
  const shopAllPreview = sampleIds.length
    ? await safe(() => memo("home:preview:" + sampleIds.join(","), () => prisma.product.findMany({ where: { id: { in: sampleIds } }, include: { variants: true } })), [] as any[])
    : [];

  const siteUrl = process.env.SITE_URL || "https://shenterprises.lk";

  return (
    <>
      <JsonLd data={organizationSchema(siteUrl)} />
      <JsonLd data={localBusinessSchema(siteUrl)} />
      <JsonLd data={websiteSchema(siteUrl)} />

      {promoText && <PromoStrip text={promoText} href="/offers" />}

      {/* Editorial hero (new) — bold typographic statement */}
      <EditorialHero products={heroProducts} />

      {/* Banner strip — admin-managed promo banners, secondary */}
      <BannerStrip banners={banners} />

      {/* Category tiles removed — strip below the header already serves as nav.
          Keeps the homepage tight and reduces scroll length. */}

      {/* On Offer — only with 2+ items; a lone card left most of the row empty
          (the offer is still on /offers and in the menu). */}
      {offers.length >= 2 && (
        <>
          <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
            <div className="flex items-end justify-between mb-8 reveal">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-saffron-600 mb-1">Limited time</p>
                <h2 className="font-display font-semibold text-3xl sm:text-4xl text-ink">On offer</h2>
              </div>
              <Link href="/offers" className="inline-flex items-center min-h-[40px] text-sm font-bold text-saffron-700 hover:text-saffron-600 shrink-0 underline decoration-dashed underline-offset-4">See all offers →</Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 reveal">
              {offers.map(p => <ProductCard key={p.id} p={p} badge="SALE" badgeColor="bg-saffron-500" />)}
            </div>
          </section>

          <div className="cut reveal"><span>✂</span></div>
        </>
      )}

      {/* Discover more */}
      {shopAllPreview.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="flex items-end justify-between mb-8 reveal">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-saffron-600 mb-1">Fresh picks</p>
              <h2 className="font-display font-semibold text-3xl sm:text-4xl text-ink">Discover more</h2>
            </div>
            <Link href="/shop" className="inline-flex items-center min-h-[40px] text-sm font-bold text-saffron-700 hover:text-saffron-600 shrink-0 underline decoration-dashed underline-offset-4">Shop all →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 reveal">
            {shopAllPreview.map(p => <ProductCard key={p.id} p={p} />)}
          </div>

          {/* Big CTA: Shop everything — visible after the 12-tile grid */}
          <div className="mt-10 flex justify-center reveal">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-xl bg-ink hover:bg-ink-soft text-cream text-base font-bold px-8 py-3.5 shadow-md hover:shadow-lg transition-all group"
            >
              Shop everything
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </section>
      )}

      {/* Industrial Machines — dark band after the accessory picks, so on phones the
          first screen reaches products instead of the machines promo. */}
      <MachinesShowcase
        machines={featuredMachines as any}
        phone={machinePhone}
        phoneDisplay={sitePhoneRaw || ""}
      />

      {/* Trust signals — on ivory band to differentiate */}
      <section className="bg-ivory border-y border-saffron-200/40 mt-6">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 reveal">
            <TrustCard icon={TRUCK} title="Island-wide delivery" body="Fast, reliable shipping to every corner of Sri Lanka." />
            <TrustCard icon={CASH} title="Cash on delivery" body="Pay when your order arrives — no card needed." />
            <TrustCard icon={BADGE} title="Quality guaranteed" body="Hand-picked supplies trusted by tailors for years." />
          </div>
        </div>
      </section>

    </>
  );
}

// Line icons (were emoji, which render differently on every phone).
const TRUCK = <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>;
const CASH = <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/></svg>;
const BADGE = <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3l2.4 1.8 3-.2.9 2.9 2.4 1.8-.9 2.9.9 2.9-2.4 1.8-.9 2.9-3-.2L12 21l-2.4-1.8-3 .2-.9-2.9-2.4-1.8.9-2.9-.9-2.9 2.4-1.8.9-2.9 3 .2z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/></svg>;

function TrustCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="tile text-left rounded-2xl bg-white border border-saffron-200/60 shadow-sm p-6 stitched">
      <div className="grid place-items-center h-14 w-14 rounded-2xl bg-saffron-100 text-saffron-700 mb-4">{icon}</div>
      <h3 className="font-display font-semibold text-xl text-ink">{title}</h3>
      <p className="text-ink-mute text-sm mt-1.5 leading-relaxed">{body}</p>
    </div>
  );
}
