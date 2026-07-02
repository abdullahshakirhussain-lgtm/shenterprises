import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";
import EditorialHero from "@/components/EditorialHero";
import BannerStrip from "@/components/BannerStrip";
import PromoStrip from "@/components/PromoStrip";
import JsonLd, { organizationSchema, websiteSchema } from "@/components/JsonLd";
import { fetchOfferProducts, maxDiscountPercent } from "@/lib/offers";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); }
  catch (e) {
    console.warn("[home] data fetch failed, using fallback:", (e as any)?.message);
    return fallback;
  }
}

export default async function HomePage() {
  const [banners, offers, allActiveIds, promoText, heroProducts] = await Promise.all([
    safe(() => prisma.banner.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }), [] as any[]),
    // Genuine sale price OR flagged on-offer — same rule as the /offers page
    safe(() => fetchOfferProducts(8), [] as any[]),
    safe(() => prisma.product.findMany({ where: { active: true }, select: { id: true } }), [] as { id: number }[]),
    safe(() => getSetting("promo_strip_text"), null),
    // Featured products for hero collage — prefer featured > on-offer > any with an image
    safe(() => prisma.product.findMany({
      where: { active: true, imageUrl: { not: null } },
      orderBy: [{ featured: "desc" }, { onOffer: "desc" }, { updatedAt: "desc" }],
      take: 3,
      select: { name: true, slug: true, imageUrl: true },
    }), [] as any[]),
  ]);

  // Real biggest discount for the offers banner (no more hardcoded "40%")
  const maxOfferDiscount = maxDiscountPercent(offers);

  const sampleIds = allActiveIds.length
    ? [...allActiveIds].sort(() => Math.random() - 0.5).slice(0, 12).map(p => p.id)
    : [];
  const shopAllPreview = sampleIds.length
    ? await safe(() => prisma.product.findMany({ where: { id: { in: sampleIds } }, include: { variants: true } }), [] as any[])
    : [];

  const siteUrl = process.env.SITE_URL || "https://shenterprises.lk";

  return (
    <>
      <JsonLd data={organizationSchema(siteUrl)} />
      <JsonLd data={websiteSchema(siteUrl)} />

      {promoText && <PromoStrip text={promoText} href="/offers" />}

      {/* Editorial hero (new) — bold typographic statement */}
      <EditorialHero products={heroProducts} />

      {/* Banner strip — admin-managed promo banners, secondary */}
      <BannerStrip banners={banners} />

      {/* Category tiles removed — strip below the header already serves as nav.
          Keeps the homepage tight and reduces scroll length. */}

      {/* On Offer */}
      {offers.length > 0 && (
        <>
          <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
            <div className="flex items-end justify-between mb-8 reveal">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-saffron-600 mb-1">Limited time</p>
                <h2 className="font-display font-semibold text-3xl sm:text-4xl text-ink">On offer <span className="text-saffron-500">🔥</span></h2>
              </div>
              <Link href="/offers" className="text-sm font-bold text-saffron-700 hover:text-saffron-600 shrink-0 underline decoration-dashed underline-offset-4">See all offers →</Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 reveal">
              {offers.map(p => <HomeProductCard key={p.id} p={p} badge="SALE" badgeColor="bg-saffron-500" />)}
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-4 py-4 md:py-6">
            <Link id="offers-banner" href="/offers" className="tile block rounded-3xl bg-ink text-cream shadow-lg overflow-hidden reveal relative">
              <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-saffron-500/30 blur-3xl" />
              <div className="relative px-6 sm:px-10 py-10 sm:py-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.2em] text-saffron-300">Limited time</p>
                  <h2 className="font-display font-semibold text-3xl sm:text-4xl mt-2 flex items-center gap-3 justify-center sm:justify-start">
                    {maxOfferDiscount > 0 ? `Up to ${maxOfferDiscount}% off` : "Special offers"} <span id="bow">🎀</span>
                  </h2>
                  <p className="text-cream/80 mt-2 max-w-md">Stock up on threads, zippers and trims while the festive deals last.</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white font-bold px-6 py-3.5 shrink-0 transition-colors">
                  Shop the sale →
                </span>
              </div>
            </Link>
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
            <Link href="/shop" className="text-sm font-bold text-saffron-700 hover:text-saffron-600 shrink-0 underline decoration-dashed underline-offset-4">Shop all →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 reveal">
            {shopAllPreview.map(p => <HomeProductCard key={p.id} p={p} />)}
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

      {/* Trust signals — on ivory band to differentiate */}
      <section className="bg-ivory border-y border-saffron-200/40 mt-6">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 reveal">
            <TrustCard emoji="🚚" altEmoji="📦" title="Island-wide delivery" body="Fast, reliable shipping to every corner of Sri Lanka." />
            <TrustCard emoji="💵" altEmoji="🤝" title="Cash on delivery" body="Pay when your order arrives — no card needed." />
            <TrustCard emoji="✅" altEmoji="🏆" title="Quality guaranteed" body="Hand-picked supplies trusted by tailors for years." />
          </div>
        </div>
      </section>

    </>
  );
}

function TrustCard({ emoji, altEmoji, title, body }: { emoji: string; altEmoji: string; title: string; body: string }) {
  return (
    <button type="button" className="egg-trust tile text-left rounded-2xl bg-white border border-saffron-200/60 shadow-sm p-6 stitched" data-alt={altEmoji}>
      <div className="ti grid place-items-center h-14 w-14 rounded-2xl bg-saffron-100 text-3xl mb-4">{emoji}</div>
      <h3 className="font-display font-semibold text-xl text-ink">{title}</h3>
      <p className="text-ink-mute text-sm mt-1.5 leading-relaxed">{body}</p>
    </button>
  );
}

function HomeProductCard({ p, badge, badgeColor }: { p: any; badge?: string; badgeColor?: string }) {
  const baseEffective = p.salePrice ?? p.price;
  const validBase = baseEffective > 0 ? baseEffective : null;
  const variants = p.variants || [];
  const variantPrices = variants
    .map((v: any) => v.salePrice ?? v.price)
    .filter((n: any): n is number => n != null && n > 0);
  const priceCandidates = [...(validBase != null ? [validBase] : []), ...variantPrices];
  const effective = priceCandidates.length > 0 ? Math.min(...priceCandidates) : 0;
  const distinct = new Set(priceCandidates).size;
  const showFrom = distinct > 1;
  const noBaseNoVariants = priceCandidates.length === 0;
  const unitLabel = p.unitQty && p.unitType ? `${p.unitQty} ${p.unitType}` : null;
  const sizes = variants.filter((v: any) => v.type === "size");
  const lengths = variants.filter((v: any) => v.type === "length");
  const colors = variants.filter((v: any) => v.type === "color");
  const packs = variants.filter((v: any) => v.type === "pack");

  return (
    <Link href={`/product/${p.slug}`} className="egg-prod tile flex flex-col rounded-2xl bg-white border border-brand-100 hover:border-saffron-300 shadow-sm overflow-hidden">
      <div className="img relative grid place-items-center aspect-square bg-brand-50 text-6xl overflow-hidden">
        {badge && (
          <span className={`absolute top-2 left-2 rounded-full ${badgeColor || "bg-emerald-600"} text-white text-[11px] font-bold px-2.5 py-1 z-10 shadow`}>{badge}</span>
        )}
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <span>🧵</span>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="font-display font-semibold text-base sm:text-lg leading-snug text-balance text-ink">
          {p.name}
          {unitLabel && lengths.length === 0 && <span className="text-ink-mute"> — {unitLabel}</span>}
        </h3>
        {(sizes.length > 0 || lengths.length > 0 || packs.length > 0 || colors.length > 1) && (
          <div className="text-[11px] mt-1 space-y-0.5">
            {sizes.length > 0 && <PillRow label="Sizes" items={sizes.map((v: any) => v.name)} />}
            {lengths.length > 0 && <PillRow label="Lengths" items={lengths.map((v: any) => v.name)} />}
            {packs.length > 0 && <PillRow label="Packs" items={packs.map((v: any) => v.name)} />}
            {colors.length > 1 && <div className="text-ink-mute">{colors.length} colors</div>}
          </div>
        )}
        <p className="mt-2 flex items-baseline gap-2">
          {noBaseNoVariants ? (
            <span className="text-sm text-ink-mute">See options</span>
          ) : (
            <>
              {showFrom && <span className="text-xs text-ink-mute">From</span>}
              <span className="font-display font-bold text-saffron-700 text-lg">{formatLKR(effective)}</span>
              {!showFrom && validBase != null && p.salePrice && (
                <span className="text-ink-mute text-sm line-through">{formatLKR(p.price)}</span>
              )}
            </>
          )}
        </p>
      </div>
    </Link>
  );
}

function PillRow({ label, items }: { label: string; items: string[] }) {
  const display = items.slice(0, 3);
  const extra = items.length - display.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-ink-mute">{label}:</span>
      {display.map((n, i) => (
        <span key={i} className="inline-block px-1.5 py-0 rounded bg-saffron-50 border border-saffron-200/60 text-saffron-700">{n}</span>
      ))}
      {extra > 0 && <span className="text-ink-mute">+{extra}</span>}
    </div>
  );
}
