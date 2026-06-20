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
    <section className="relative overflow-hidden">
      {/* Decorative blobs behind the hero — sized down so they don't push horizontal overflow */}
      <div aria-hidden className="pointer-events-none absolute -top-16 -left-16 w-[260px] h-[260px] md:w-[420px] md:h-[420px] rounded-full bg-saffron-100 blur-3xl opacity-50" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 w-[280px] h-[280px] md:w-[480px] md:h-[480px] rounded-full bg-brand-100 blur-3xl opacity-60" />

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

        {/* Right: solid hero tile — single confident product showcase */}
        <div className="md:col-span-5 relative hidden sm:block">
          {collage.length === 0 ? (
            <DecorativePanel />
          ) : (
            <HeroShowcase main={collage[0]} secondary={collage[1] || null} />
          )}
        </div>
      </div>
    </section>
  );
}

function HeroShowcase({ main, secondary }: { main: HeroProduct; secondary: HeroProduct | null }) {
  return (
    <div className="relative">
      {/* Big primary product tile — square, grounded, no rotation */}
      <Link
        href={`/product/${main.slug}`}
        className="block group relative aspect-square rounded-3xl overflow-hidden bg-white border border-saffron-200/60 shadow-xl"
      >
        {main.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={main.imageUrl}
            alt={main.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-50 to-saffron-100 grid place-items-center text-7xl">🧵</div>
        )}
        {/* Caption strip at bottom — gives the tile editorial weight */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-saffron-300 mb-1">Featured</p>
          <p className="font-display text-cream text-lg leading-snug line-clamp-2 drop-shadow">{main.name}</p>
        </div>
      </Link>

      {/* Optional secondary product as a small floating chip — bottom-left, grounded against the main tile */}
      {secondary && (
        <Link
          href={`/product/${secondary.slug}`}
          className="absolute -bottom-6 -left-6 w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-white border-4 border-cream shadow-xl group hidden md:block"
        >
          {secondary.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={secondary.imageUrl}
              alt={secondary.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-saffron-100 grid place-items-center text-3xl">🧵</div>
          )}
        </Link>
      )}

      {/* Small saffron tag, top-right, instead of rotated 01/02/03 numbers */}
      <span className="absolute -top-3 -right-3 bg-saffron-500 text-white font-display font-bold text-xs px-3 py-1.5 rounded-full shadow-md tracking-wide">
        Editor&apos;s pick
      </span>
    </div>
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
