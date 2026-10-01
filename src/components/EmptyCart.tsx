"use client";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

/** Shared empty-basket state for /cart and /checkout so both look the same. */
export default function EmptyCart() {
  const { t } = useLanguage();
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-saffron-200/60 shadow-md p-10 text-center stitched max-w-xl mx-auto">
      <div className="mx-auto mb-4 grid place-items-center h-16 w-16 rounded-2xl bg-saffron-100 text-saffron-700">
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 9h18l-1.6 9.2a2 2 0 0 1-2 1.8H6.6a2 2 0 0 1-2-1.8z" />
          <path d="M8 9l3-5M16 9l-3-5M9 13v3M15 13v3M12 13v3" />
        </svg>
      </div>
      <p className="font-display italic text-xl text-ink mb-2">{t("cart_empty")}</p>
      <p className="text-ink-mute text-sm mb-5">Find threads, trims, and tools to bring your next make to life.</p>
      <Link href="/shop" className="inline-block rounded-xl bg-ink hover:bg-ink-soft text-cream text-sm font-bold px-5 py-2.5 transition-colors">
        {t("continue_shopping")}
      </Link>
    </div>
  );
}
