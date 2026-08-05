"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import SmartImage from "@/components/SmartImage";

export type HeroSlide = { slug: string; imageUrl: string; brand: string; modelNumber: string; name: string };

/**
 * Auto-advancing hero slideshow for the machines hub. Each slide is a link to
 * that machine's page. Pauses on hover; dots + arrows for manual control.
 */
export default function MachineHeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const n = slides.length;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (n <= 1 || paused) return;
    const t = setInterval(() => setI(v => (v + 1) % n), 4500);
    return () => clearInterval(t);
  }, [n, paused]);

  if (n === 0) return null;
  const go = (d: number) => setI(v => (v + d + n) % n);

  return (
    <div
      className="relative border-[1.5px] border-dashed border-[#D8CBB4] rounded-3xl p-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-[4/3] bg-white border border-[#E8E0D2] rounded-2xl overflow-hidden">
        {slides.map((s, idx) => (
          <Link
            key={s.slug}
            href={`/machines/${s.slug}`}
            aria-hidden={idx !== i}
            tabIndex={idx === i ? 0 : -1}
            className={`absolute inset-0 transition-opacity duration-700 ${idx === i ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
          >
            <SmartImage
              src={s.imageUrl}
              alt={`${s.brand} ${s.modelNumber} — ${s.name}`}
              sizes="(max-width: 640px) 100vw, 380px"
              fit="contain"
              priority={idx === 0}
            />
            {/* Museum-plate caption */}
            <div className="absolute left-0 right-0 bottom-0 bg-[#1D1A16]/85 px-4 py-2.5">
              <p className="text-cream font-display font-semibold text-[15px] leading-tight">{s.brand} {s.modelNumber}</p>
              <p className="text-cream/70 text-[12px] leading-tight line-clamp-1 mt-0.5">{s.name} · <span className="text-[#F5C97F]">View →</span></p>
            </div>
          </Link>
        ))}

        {n > 1 && (
          <>
            <button type="button" aria-label="Previous" onClick={() => go(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 grid place-items-center rounded-full bg-white/85 hover:bg-white text-[#1D1A16] shadow border border-[#E8E0D2]">‹</button>
            <button type="button" aria-label="Next" onClick={() => go(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 grid place-items-center rounded-full bg-white/85 hover:bg-white text-[#1D1A16] shadow border border-[#E8E0D2]">›</button>
          </>
        )}
      </div>

      {n > 1 && (
        <div className="flex justify-center gap-1.5 mt-2.5">
          {slides.map((_, idx) => (
            <button key={idx} type="button" aria-label={`Go to slide ${idx + 1}`} onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-5 bg-[#B9741F]" : "w-1.5 bg-[#D8CBB4] hover:bg-[#C6B896]"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
