"use client";
import { useState } from "react";
import Link from "next/link";

export default function PromoStrip({ text, href }: { text: string; href: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="relative bg-brand-700 text-white text-sm font-semibold">
      <Link href={href} className="block py-2 px-4 text-center hover:bg-brand-800 transition-colors">
        <span className="mr-2">🎉</span>{text}
        <span className="ml-2 underline decoration-white/40 underline-offset-2">Shop now →</span>
      </Link>
      <button onClick={() => setDismissed(true)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-lg leading-none w-6 h-6 flex items-center justify-center"
        aria-label="Dismiss">×</button>
    </div>
  );
}
