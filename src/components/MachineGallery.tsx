"use client";
import SmartImage from "./SmartImage";
import { useState, useEffect } from "react";

export default function MachineGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(images[0] || null);
  useEffect(() => { setActive(images[0] || null); }, [images]);

  return (
    <div>
      <div className="relative aspect-square rounded-2xl bg-white/5 border border-white/10 overflow-hidden grid place-items-center">
        {active ? (
          // eslint-disable-next-line @next/next/no-img-element
          <SmartImage src={active} alt={alt} sizes="(max-width: 768px) 100vw, 600px" fit="contain" priority />
        ) : (
          <div className="text-6xl opacity-30">⚙️</div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setActive(url)}
              className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition ${active === url ? "border-saffron-400" : "border-white/10 hover:border-white/40"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <SmartImage src={url} alt="" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
