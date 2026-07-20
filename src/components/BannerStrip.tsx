"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SmartImage from "@/components/SmartImage";

type Banner = {
  id: number;
  imageUrl: string;
  headline: string | null;
  subtitle: string | null;
  buttonText: string | null;
  buttonHref: string | null;
};

/**
 * Slimmer banner slideshow — sits below the editorial hero.
 * Showcases promo/seasonal banners without being the first impression.
 */
export default function BannerStrip({ banners }: { banners: Banner[] }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = banners.length;
  const go = (i: number) => setIdx(((i % count) + count) % count); // wraps both ways
  const next = () => go(idx + 1);
  const prev = () => go(idx - 1);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const tm = setInterval(() => setIdx(i => (i + 1) % count), 6000);
    return () => clearInterval(tm);
  }, [count, paused, idx]);

  // Touch swipe (mobile)
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) (dx < 0 ? next() : prev()); // swipe left → next
    touchStartX.current = null;
  }

  if (count === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <div
        className="relative w-full aspect-[3.5/1] min-h-[180px] sm:min-h-[220px] md:min-h-[260px] rounded-3xl overflow-hidden bg-brand-100 shadow-md select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {banners.map((b, i) => (
          <div key={b.id}
            className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? "opacity-100 z-10" : "opacity-0 z-0"}`}
            aria-hidden={i !== idx}>
            <SmartImage src={b.imageUrl} alt={b.headline || ""} sizes="(max-width: 1152px) 100vw, 1152px" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink/65 via-ink/30 to-transparent" />
            <div className="absolute inset-0 z-10 flex items-center">
              <div className="px-6 sm:px-10 max-w-lg text-white">
                {b.headline && (
                  <h2 className="font-display font-bold leading-tight text-2xl sm:text-3xl md:text-4xl drop-shadow-md">
                    {b.headline}
                  </h2>
                )}
                {b.subtitle && (
                  <p className="mt-2 text-sm sm:text-base text-white/90 drop-shadow max-w-md">{b.subtitle}</p>
                )}
                {b.buttonText && b.buttonHref && (
                  <Link href={b.buttonHref}
                    className="inline-block mt-4 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-bold px-5 py-2.5 shadow transition-colors">
                    {b.buttonText}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}

        {count > 1 && (
          <>
            {/* Prev / next arrows — clickable ‹ › (also swipeable on touch) */}
            <button
              onClick={prev}
              aria-label="Previous banner"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 grid place-items-center w-9 h-9 rounded-full bg-white/70 hover:bg-white text-ink shadow-md backdrop-blur transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4 L6 10 L12 16" /></svg>
            </button>
            <button
              onClick={next}
              aria-label="Next banner"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 grid place-items-center w-9 h-9 rounded-full bg-white/70 hover:bg-white text-ink shadow-md backdrop-blur transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 4 L14 10 L8 16" /></svg>
            </button>

            <div className="absolute bottom-3 right-4 z-20 flex gap-1.5">
              {banners.map((_, i) => (
                <button key={i} onClick={() => go(i)}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"}`}
                  aria-label={`Go to slide ${i + 1}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
