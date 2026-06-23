import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";
import EditorialHero from "@/components/EditorialHero";
import BannerStrip from "@/components/BannerStrip";
import PromoStrip from "@/components/PromoStrip";
import { TapeMeasure } from "@/components/CraftDecorations";
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
    safe(() => prisma.product.findMany({ where: { active: true, onOffer: true }, take: 4, orderBy: { updatedAt: "desc" }, include: { variants: true } }), [] as any[]),
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

  const sampleIds = allActiveIds.length
    ? [...allActiveIds].sort(() => Math.random() - 0.5).slice(0, 12).map(p => p.id)
    : [];
  const shopAllPreview = sampleIds.length
    ? await safe(() => prisma.product.findMany({ where: { id: { in: sampleIds } }, include: { variants: true } }), [] as any[])
    : [];

  return (
    <>
      {promoText && <PromoStrip text={promoText} href="/offers" />}

      {/* Editorial hero (new) — bold typographic statement */}
      <EditorialHero products={heroProducts} />

      {/* Banner strip — admin-managed promo banners, secondary */}
      <BannerStrip banners={banners} />

      {/* Category tiles removed — strip below the header already serves as nav.
          Keeps the homepage tight and reduces scroll length. */}

      {/* AI Project Helper banner — now styled to match the new palette */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <Link href="/ai-helper"
          className="tile block rounded-3xl bg-gradient-to-br from-saffron-50 via-saffron-100 to-brand-100 border border-saffron-200 shadow-md overflow-hidden reveal relative">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-saffron-300 blur-2xl opacity-50" />
          {/* Decorative tape measure curling across the top edge */}
          <TapeMeasure className="absolute -top-2 right-12 w-44 h-20 text-thread-teal-500 opacity-60 pointer-events-none rotate-[-8deg] hidden sm:block" />
          <div className="relative px-6 sm:px-10 py-8 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
            <div className="flex items-center gap-5">
              <div className="grid place-items-center h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white shadow-sm text-3xl sm:text-4xl shrink-0 border border-saffron-200">✨</div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-saffron-700">AI Project Helper</p>
                <h2 className="font-display font-semibold text-2xl sm:text-3xl mt-1 text-ink">Tell us what you&apos;re making</h2>
                <p className="text-ink-mute text-sm sm:text-base mt-1.5 max-w-md">Describe your project — we&apos;ll pick exactly the threads, buttons and trims you need.</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-xl bg-ink text-cream font-bold px-6 py-3 shrink-0 hover:bg-ink-soft transition-colors">
              Try it now →
            </span>
          </div>
        </Link>
      </section>

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
                    Up to 40% off <span id="bow">🎀</span>
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
