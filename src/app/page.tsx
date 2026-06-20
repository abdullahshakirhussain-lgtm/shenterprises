import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";
import HeroSlideshow from "@/components/HeroSlideshow";
import PromoStrip from "@/components/PromoStrip";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

const CATEGORY_META: Record<string, { emoji: string; bg: string; anim: string }> = {
  threads:           { emoji: "🧵", bg: "#FBEAD9", anim: "cat-roll" },
  zippers:           { emoji: "🔗", bg: "#E7EFF6", anim: "cat-wiggle" },
  buttons:           { emoji: "🔘", bg: "#F3E9F6", anim: "cat-spin" },
  ribbons:           { emoji: "🎀", bg: "#FBE6EE", anim: "cat-wiggle" },
  scissors:          { emoji: "✂️", bg: "#E9F1EC", anim: "cat-wiggle" },
  elastics:          { emoji: "➰", bg: "#FBEAD9", anim: "cat-bounce" },
  "lace-trims":      { emoji: "🪢", bg: "#F3E9F6", anim: "cat-wiggle" },
  "needles-pins":    { emoji: "🧷", bg: "#E7EFF6", anim: "cat-bounce" },
  "fabric-markers":  { emoji: "🖊️", bg: "#FBE6EE", anim: "cat-wiggle" },
  "tools-accessories": { emoji: "🧰", bg: "#E9F1EC", anim: "cat-wiggle" },
};

// Resilient fetchers — if Supabase blips, the home page still renders with empty sections
// instead of crashing the whole page.
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); }
  catch (e) {
    console.warn("[home] data fetch failed, using fallback:", (e as any)?.message);
    return fallback;
  }
}

export default async function HomePage() {
  const [banners, categories, offers, allActiveIds, promoText] = await Promise.all([
    safe(() => prisma.banner.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }), [] as any[]),
    safe(() => prisma.category.findMany({ orderBy: { sortOrder: "asc" } }), [] as any[]),
    safe(() => prisma.product.findMany({ where: { active: true, onOffer: true }, take: 4, orderBy: { updatedAt: "desc" }, include: { variants: true } }), [] as any[]),
    safe(() => prisma.product.findMany({ where: { active: true }, select: { id: true } }), [] as { id: number }[]),
    safe(() => getSetting("promo_strip_text"), null),
  ]);

  // Truly random 4 products for "Discover more" — re-shuffled on each load
  const sampleIds = allActiveIds.length
    ? [...allActiveIds].sort(() => Math.random() - 0.5).slice(0, 4).map(p => p.id)
    : [];
  const shopAllPreview = sampleIds.length
    ? await safe(() => prisma.product.findMany({ where: { id: { in: sampleIds } }, include: { variants: true } }), [] as any[])
    : [];

  return (
    <>
      {/* Top promo strip — appears above the header when set */}
      {promoText && <PromoStrip text={promoText} href="/offers" />}

      {/* Hero slideshow */}
      <HeroSlideshow banners={banners} />

      <div className="cut reveal mt-10"><span>✂</span></div>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="flex items-end justify-between mb-6 reveal">
          <h2 className="font-serif font-bold text-2xl sm:text-3xl">Shop by category</h2>
          <Link href="/shop" className="text-sm font-bold text-brand-700 hover:text-brand-600 shrink-0">All products →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 reveal">
          {categories.map(c => {
            const m = CATEGORY_META[c.slug] || { emoji: "🧶", bg: "#F5EFE6", anim: "cat-wiggle" };
            const id = c.slug === "scissors" ? "cat-scissors" : undefined;
            return (
              <Link key={c.slug} id={id} href={`/category/${c.slug}`}
                className={`${m.anim} tile flex flex-col items-center justify-center gap-2 rounded-2xl border border-brand-100 shadow-sm py-6 px-2 text-center`}
                style={{ background: m.bg }}>
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt={c.name} className="ico w-12 h-12 object-cover rounded-full" />
                ) : (
                  <span className="ico text-4xl">{m.emoji}</span>
                )}
                <span className="font-bold text-sm sm:text-base">{c.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="cut reveal"><span>✂</span></div>

      {/* AI Project Helper banner */}
      <section className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <Link
          href="/ai-helper"
          className="tile block rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 border border-brand-200 shadow-sm overflow-hidden reveal hover:shadow-md transition-shadow"
        >
          <div className="px-6 sm:px-10 py-7 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-4">
              <div className="grid place-items-center h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-white shadow-sm text-3xl sm:text-4xl shrink-0">✨</div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600">AI Project Helper</p>
                <h2 className="font-serif font-bold text-xl sm:text-2xl mt-1 text-brand-900">Tell us what you&apos;re making</h2>
                <p className="text-brand-700 text-sm mt-1 max-w-md">Describe your project and we&apos;ll pick exactly the threads, buttons and trims you need.</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-xl bg-brand-700 text-white font-bold px-5 py-2.5 shrink-0 hover:bg-brand-800 transition-colors">
              Try it →
            </span>
          </div>
        </Link>
      </section>

      {/* On Offer (hidden if no products on offer) */}
      {offers.length > 0 && (
        <>
          <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
            <div className="flex items-end justify-between mb-6 reveal">
              <h2 className="font-serif font-bold text-2xl sm:text-3xl">On offer 🔥</h2>
              <Link href="/offers" className="text-sm font-bold text-brand-700 hover:text-brand-600 shrink-0">See all offers →</Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 reveal">
              {offers.map(p => <HomeProductCard key={p.id} p={p} badge="SALE" badgeColor="bg-brand-600" />)}
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-4 py-4 md:py-6">
            <Link id="offers-banner" href="/offers" className="tile block rounded-2xl bg-brand-600 text-white shadow-sm overflow-hidden reveal">
              <div className="px-6 sm:px-10 py-8 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-100">Limited time</p>
                  <h2 className="font-serif font-bold text-3xl sm:text-4xl mt-1 flex items-center gap-3 justify-center sm:justify-start">
                    Up to 40% off <span id="bow">🎀</span>
                  </h2>
                  <p className="text-brand-100 mt-2 max-w-md">Stock up on threads, zippers and trims while the festive deals last.</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-xl bg-white text-brand-700 font-bold px-6 py-3.5 shrink-0">
                  Shop the sale →
                </span>
              </div>
            </Link>
          </section>

          <div className="cut reveal"><span>✂</span></div>
        </>
      )}

      {/* Discover more — random 4 products, refreshes on every page load */}
      {shopAllPreview.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="flex items-end justify-between mb-6 reveal">
            <h2 className="font-serif font-bold text-2xl sm:text-3xl">Discover more</h2>
            <Link href="/shop" className="text-sm font-bold text-brand-700 hover:text-brand-600 shrink-0">Shop all →</Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 reveal">
            {shopAllPreview.map(p => <HomeProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      <div className="cut reveal"><span>✂</span></div>

      {/* Trust signals (click for flip easter egg) */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 reveal">
          <button type="button" className="egg-trust tile text-left rounded-2xl bg-white border border-brand-100 shadow-sm p-6" data-alt="📦">
            <div className="ti grid place-items-center h-14 w-14 rounded-full bg-brand-50 text-3xl mb-3">🚚</div>
            <h3 className="font-serif font-bold text-lg">Island-wide delivery</h3>
            <p className="text-muted text-sm mt-1">Fast, reliable shipping to every corner of Sri Lanka.</p>
          </button>
          <button type="button" className="egg-trust tile text-left rounded-2xl bg-white border border-brand-100 shadow-sm p-6" data-alt="🤝">
            <div className="ti grid place-items-center h-14 w-14 rounded-full bg-brand-50 text-3xl mb-3">💵</div>
            <h3 className="font-serif font-bold text-lg">Cash on delivery</h3>
            <p className="text-muted text-sm mt-1">Pay when your order arrives — no card needed.</p>
          </button>
          <button type="button" className="egg-trust tile text-left rounded-2xl bg-white border border-brand-100 shadow-sm p-6" data-alt="🏆">
            <div className="ti grid place-items-center h-14 w-14 rounded-full bg-brand-50 text-3xl mb-3">✅</div>
            <h3 className="font-serif font-bold text-lg">Quality guaranteed</h3>
            <p className="text-muted text-sm mt-1">Hand-picked supplies trusted by tailors for years.</p>
          </button>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <h2 className="font-serif font-bold text-2xl sm:text-3xl text-center mb-8 reveal">Loved by tailors &amp; crafters</h2>
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 reveal">
          <figure className="rounded-2xl bg-white border border-brand-100 shadow-sm p-6">
            <div className="text-brand-400 text-lg mb-2" aria-label="5 out of 5 stars">★★★★★</div>
            <blockquote className="text-ink/90 leading-relaxed">&ldquo;Best place for threads and zippers in Colombo. Delivery was quick and everything was good quality.&rdquo;</blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              <span className="grid place-items-center h-10 w-10 rounded-full bg-brand-100 font-bold text-brand-700">N</span>
              <span><span className="block font-bold text-sm">Nimali Perera</span><span className="block text-muted text-xs">Home tailor, Colombo</span></span>
            </figcaption>
          </figure>
          <figure className="rounded-2xl bg-white border border-brand-100 shadow-sm p-6">
            <div className="text-brand-400 text-lg mb-2" aria-label="5 out of 5 stars">★★★★★</div>
            <blockquote className="text-ink/90 leading-relaxed">&ldquo;I run a small boutique and order in bulk. Prices are fair and the staff are very helpful.&rdquo;</blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              <span className="grid place-items-center h-10 w-10 rounded-full bg-brand-100 font-bold text-brand-700">R</span>
              <span><span className="block font-bold text-sm">Roshan Fernando</span><span className="block text-muted text-xs">Boutique owner, Kandy</span></span>
            </figcaption>
          </figure>
          <figure className="rounded-2xl bg-white border border-brand-100 shadow-sm p-6">
            <div className="text-brand-400 text-lg mb-2" aria-label="5 out of 5 stars">★★★★★</div>
            <blockquote className="text-ink/90 leading-relaxed">&ldquo;So easy to order on my phone. Cash on delivery made it stress-free. Highly recommend!&rdquo;</blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              <span className="grid place-items-center h-10 w-10 rounded-full bg-brand-100 font-bold text-brand-700">F</span>
              <span><span className="block font-bold text-sm">Fathima Rizwan</span><span className="block text-muted text-xs">Craft hobbyist, Galle</span></span>
            </figcaption>
          </figure>
        </div>
      </section>
    </>
  );
}

function HomeProductCard({ p, badge, badgeColor }: { p: any; badge?: string; badgeColor?: string }) {
  const baseEffective = p.salePrice ?? p.price;
  const variants = p.variants || [];
  const variantPrices = variants
    .map((v: any) => v.salePrice ?? v.price)
    .filter((n: any): n is number => n != null);
  const hasVariantPricing = variantPrices.length > 0;
  const effective = hasVariantPricing ? Math.min(baseEffective, ...variantPrices) : baseEffective;
  const showFrom = hasVariantPricing && variantPrices.some((pr: number) => pr !== baseEffective);
  const unitLabel = p.unitQty && p.unitType ? `${p.unitQty} ${p.unitType}` : null;
  const sizes = variants.filter((v: any) => v.type === "size");
  const lengths = variants.filter((v: any) => v.type === "length");
  const colors = variants.filter((v: any) => v.type === "color");
  const packs = variants.filter((v: any) => v.type === "pack");

  return (
    <Link href={`/product/${p.slug}`} className="egg-prod tile flex flex-col rounded-2xl bg-white border border-brand-100 hover:border-brand-300 shadow-sm overflow-hidden">
      <div className="img relative grid place-items-center aspect-square bg-brand-50 text-6xl overflow-hidden">
        {badge && (
          <span className={`absolute top-2 left-2 rounded-full ${badgeColor || "bg-emerald-600"} text-white text-[11px] font-bold px-2.5 py-1 z-10`}>{badge}</span>
        )}
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <span>🧵</span>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-sm sm:text-base leading-snug text-balance">
          {p.name}
          {unitLabel && lengths.length === 0 && <span className="text-muted"> — {unitLabel}</span>}
        </h3>
        {(sizes.length > 0 || lengths.length > 0 || packs.length > 0 || colors.length > 1) && (
          <div className="text-[11px] mt-1 space-y-0.5">
            {sizes.length > 0 && <PillRow label="Sizes" items={sizes.map((v: any) => v.name)} />}
            {lengths.length > 0 && <PillRow label="Lengths" items={lengths.map((v: any) => v.name)} />}
            {packs.length > 0 && <PillRow label="Packs" items={packs.map((v: any) => v.name)} />}
            {colors.length > 1 && <div className="text-muted">{colors.length} colors</div>}
          </div>
        )}
        <p className="mt-2 flex items-baseline gap-2">
          {showFrom && <span className="text-xs text-muted">From</span>}
          <span className="font-serif font-bold text-brand-700 text-lg">{formatLKR(effective)}</span>
          {!showFrom && p.salePrice && <span className="text-muted text-sm line-through">{formatLKR(p.price)}</span>}
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
      <span className="text-muted">{label}:</span>
      {display.map((n, i) => (
        <span key={i} className="inline-block px-1.5 py-0 rounded bg-brand-50 border border-brand-200 text-brand-700">{n}</span>
      ))}
      {extra > 0 && <span className="text-muted">+{extra}</span>}
    </div>
  );
}
