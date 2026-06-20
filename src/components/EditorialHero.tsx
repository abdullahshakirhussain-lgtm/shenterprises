"use client";
import Link from "next/link";
import { useLanguage } from "./LanguageProvider";

type HeroProduct = { name: string; slug: string; imageUrl: string | null };

/**
 * Editorial hero — bold typographic left, product collage right.
 * Replaces the slideshow as the primary first impression. Banners (if any)
 * move to a smaller secondary strip below.
 */
export default function EditorialHero({ products }: { products: HeroProduct[] }) {
  const { t } = useLanguage();
  const collage = products.slice(0, 3);

  return (
    <section className="relative overflow-hidden bg-saffron-50 border-b border-saffron-200/50">
      {/* Decorative blobs behind the hero — sit inside the solid background to add depth */}
      <div aria-hidden className="pointer-events-none absolute -top-16 -left-16 w-[260px] h-[260px] md:w-[420px] md:h-[420px] rounded-full bg-saffron-200 blur-3xl opacity-60" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 w-[280px] h-[280px] md:w-[480px] md:h-[480px] rounded-full bg-brand-200 blur-3xl opacity-50" />

      <div className="relative mx-auto max-w-6xl px-4 pt-8 pb-10 md:pt-16 md:pb-20 grid md:grid-cols-12 gap-8 items-center">
        {/* Left: type-led story */}
        <div className="md:col-span-7 relative min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur border border-saffron-200 px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-[.15em] text-saffron-700 uppercase mb-4 sm:mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-saffron-500 animate-pulse" />
            Sri Lanka&apos;s craft supply home
          </p>
          <h1 className="font-display font-semibold text-ink leading-[1.05] text-[2.25rem] sm:text-5xl md:text-6xl lg:text-7xl tracking-tight break-words">
            <span className="block">Threads, trims</span>
            <span className="block">
              &amp; tools for{" "}
              <span className="relative inline-block italic text-saffron-600">
                every stitch
                <svg
                  aria-hidden
                  className="absolute -bottom-2 sm:-bottom-3 left-0 w-full"
                  viewBox="0 0 420 18"
                  preserveAspectRatio="none"
                  fill="none"
                >
                  <path
                    d="M3 12 C 90 4, 320 4, 417 12"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="8 6"
                  />
                </svg>
              </span>
            </span>
          </h1>

          <p className="mt-5 sm:mt-7 text-sm sm:text-base md:text-lg text-ink-mute max-w-md leading-relaxed">
            Hand-picked threads, zippers, scissors and notions trusted by tailors and crafters from Jaffna to Galle.
          </p>

          <div className="mt-6 sm:mt-7 flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="thread-btn inline-flex items-center justify-center rounded-xl bg-ink hover:bg-ink-soft text-cream text-sm sm:text-base font-bold px-5 sm:px-7 py-3 sm:py-3.5 shadow-sm transition-colors"
            >
              Shop everything
            </Link>
            <Link
              href="/ai-helper"
              className="inline-flex items-center gap-2 rounded-xl bg-white border-2 border-saffron-300 hover:border-saffron-500 text-saffron-700 text-sm sm:text-base font-bold px-5 sm:px-7 py-3 sm:py-3.5 transition-colors"
            >
              ✨ Try the AI Helper
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink-soft">
            <li className="flex items-center gap-2"><Check /> {t("islandwide_delivery")}</li>
            <li className="flex items-center gap-2"><Check /> {t("cod_available")}</li>
            <li className="flex items-center gap-2"><Check /> {t("bank_accepted")}</li>
          </ul>
        </div>

        {/* Right: collage — three offset product cards */}
        <div className="md:col-span-5 relative h-[380px] sm:h-[440px] md:h-[480px] hidden sm:block">
          {collage.length === 0 ? (
            <DecorativePanel />
          ) : (
            <>
              {collage[0] && (
                <CollageCard
                  product={collage[0]}
                  className="absolute top-0 left-2 w-[58%] aspect-[3/4] z-10 rotate-[-4deg]"
                  badge="01"
                />
              )}
              {collage[1] && (
                <CollageCard
                  product={collage[1]}
                  className="absolute top-12 right-0 w-[60%] aspect-[3/4] z-20 rotate-[3deg]"
                  badge="02"
                />
              )}
              {collage[2] && (
                <CollageCard
                  product={collage[2]}
                  className="absolute bottom-0 left-10 w-[55%] aspect-square z-30 rotate-[-1deg]"
                  badge="03"
                />
              )}
              {/* Decorative needle/thread svg */}
              <svg
                aria-hidden
                className="absolute top-2 right-2 w-16 h-16 text-saffron-400 z-40 -rotate-12"
                viewBox="0 0 64 64"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <line x1="8" y1="56" x2="46" y2="18" />
                <ellipse cx="49" cy="15" rx="7" ry="3" transform="rotate(-45 49 15)" />
                <circle cx="49" cy="15" r="1.5" fill="currentColor" />
              </svg>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function CollageCard({
  product,
  className,
  badge,
}: {
  product: HeroProduct;
  className: string;
  badge: string;
}) {
  return (
    <Link href={`/product/${product.slug}`} className={`${className} group`}>
      <div className="w-full h-full bg-white rounded-2xl shadow-xl overflow-hidden border border-brand-200 transition-transform group-hover:scale-[1.02] group-hover:rotate-0">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-50 to-saffron-100 grid place-items-center text-5xl">🧵</div>
        )}
      </div>
      {/* Number badge */}
      <span className="absolute -top-3 -left-3 bg-ink text-cream font-display font-bold text-xs px-2.5 py-1 rounded-full shadow-md tracking-widest">
        {badge}
      </span>
    </Link>
  );
}

function DecorativePanel() {
  return (
    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-saffron-100 via-brand-50 to-brand-200/60 grid place-items-center stitched">
      <div className="text-center px-6">
        <div className="text-7xl mb-3">🧵</div>
        <p className="font-display text-2xl text-ink">Crafted with care</p>
        <p className="text-sm text-ink-mute mt-1">Add featured products to fill this space</p>
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg className="w-4 h-4 text-saffron-600" viewBox="0 0 20 20" fill="none">
      <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
