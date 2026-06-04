"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "./LanguageProvider";

type Banner = {
  id: number;
  imageUrl: string;
  headline: string | null;
  subtitle: string | null;
  buttonText: string | null;
  buttonHref: string | null;
};

export default function HeroSlideshow({ banners }: { banners: Banner[] }) {
  const { t } = useLanguage();
  const [idx, setIdx] = useState(0);

  // Auto-rotate every 6s
  useEffect(() => {
    if (banners.length <= 1) return;
    const tm = setInterval(() => setIdx(i => (i + 1) % banners.length), 6000);
    return () => clearInterval(tm);
  }, [banners.length]);

  // Fallback: no banners → static gradient hero
  if (banners.length === 0) {
    return (
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-100 via-cream to-brand-200/70" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 md:py-20 text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/70 border border-brand-200 px-3 py-1 text-xs font-bold tracking-wide text-brand-700 uppercase mb-4">
            🇱🇰 Trusted across Sri Lanka
          </p>
          <h1 className="font-serif font-bold leading-tight text-4xl sm:text-5xl text-ink max-w-3xl mx-auto">
            Everything you need for{" "}
            <span className="relative inline-block">craft &amp; tailoring
              <svg className="stitch-underline absolute left-0 -bottom-2 w-full" height="14" viewBox="0 0 520 14" preserveAspectRatio="none" fill="none">
                <path d="M2 9 C 130 2, 390 2, 518 9" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted max-w-xl mx-auto">
            Threads, zippers, scissors, ribbons, buttons and more — quality supplies trusted by tailors and craft lovers islandwide.
          </p>
          <ActionRow t={t} />
          <TrustRow t={t} />
        </div>
      </section>
    );
  }

  const cur = banners[idx];

  return (
    <section className="relative overflow-hidden">
      {/* Slides */}
      <div className="relative w-full aspect-[3/1] min-h-[320px] sm:min-h-[400px] md:min-h-[480px] bg-brand-100">
        {banners.map((b, i) => (
          <div key={b.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === idx ? "opacity-100 z-10" : "opacity-0 z-0"}`}
            aria-hidden={i !== idx}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.imageUrl} alt={b.headline || ""} className="w-full h-full object-cover" />
            {/* Subtle gradient overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/30 to-transparent" />

            {/* Text overlay */}
            <div className="absolute inset-0 z-10 flex items-center">
              <div className="mx-auto max-w-6xl w-full px-4 sm:px-8">
                <div className="max-w-xl text-white">
                  {b.headline && (
                    <h1 className="font-serif font-bold leading-tight text-3xl sm:text-5xl drop-shadow-lg">
                      {b.headline}
                    </h1>
                  )}
                  {b.subtitle && (
                    <p className="mt-3 text-base sm:text-lg text-white/90 drop-shadow max-w-md">{b.subtitle}</p>
                  )}
                  {b.buttonText && b.buttonHref && (
                    <Link href={b.buttonHref}
                      className="thread-btn inline-block mt-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-bold px-7 py-3.5 shadow-lg transition-colors">
                      {b.buttonText}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`h-2 rounded-full transition-all ${i === idx ? "w-8 bg-white" : "w-2 bg-white/60 hover:bg-white/80"}`}
                aria-label={`Go to slide ${i + 1}`} />
            ))}
          </div>
        )}
      </div>

      {/* Action row below — Shop now / View offers + trust badges */}
      <div className="bg-cream border-b border-brand-100">
        <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
            <Link href="/shop"
              className="thread-btn rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-bold px-7 py-3 shadow-sm transition-colors text-center">
              Shop now
            </Link>
            <Link href="/offers"
              className="rounded-xl bg-white border border-brand-300 hover:border-brand-500 text-brand-700 text-base font-bold px-7 py-3 transition-colors text-center">
              View offers
            </Link>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 justify-center sm:justify-end text-sm font-semibold text-ink/80">
            <li className="flex items-center gap-1.5"><span className="text-brand-600">✓</span> {t("islandwide_delivery")}</li>
            <li className="flex items-center gap-1.5"><span className="text-brand-600">✓</span> {t("cod_available")}</li>
            <li className="flex items-center gap-1.5"><span className="text-brand-600">✓</span> {t("bank_accepted")}</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function ActionRow({ t }: { t: (k: any) => string }) {
  return (
    <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
      <Link href="/shop"
        className="thread-btn rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-bold px-7 py-3.5 shadow-sm transition-colors">
        Shop now
      </Link>
      <Link href="/offers"
        className="rounded-xl bg-white border border-brand-300 hover:border-brand-500 text-brand-700 text-base font-bold px-7 py-3.5 transition-colors">
        View offers
      </Link>
    </div>
  );
}

function TrustRow({ t }: { t: (k: any) => string }) {
  return (
    <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 justify-center text-sm font-semibold text-ink/80">
      <li className="flex items-center gap-1.5"><span className="text-brand-600">✓</span> {t("islandwide_delivery")}</li>
      <li className="flex items-center gap-1.5"><span className="text-brand-600">✓</span> {t("cod_available")}</li>
      <li className="flex items-center gap-1.5"><span className="text-brand-600">✓</span> {t("bank_accepted")}</li>
    </ul>
  );
}
