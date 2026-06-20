"use client";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import LanguageSwitcher from "./LanguageSwitcher";
import SearchBox from "./SearchBox";

type CategoryNav = { name: string; nameSi?: string | null; nameTa?: string | null; slug: string };

export default function Header({ categories }: { categories: CategoryNav[] }) {
  const { count } = useCart();
  const { t, lang } = useLanguage();
  const catName = (c: CategoryNav) =>
    lang === "si" && c.nameSi ? c.nameSi :
    lang === "ta" && c.nameTa ? c.nameTa :
    c.name;
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) return null;
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<{ fullName: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setMe(d.user));
  }, []);

  function onLogoClick(e: React.MouseEvent) {
    e.preventDefault();
    window.dispatchEvent(new Event("sh:logo"));
    setTimeout(() => { window.location.href = "/"; }, 50);
  }

  return (
    <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur border-b border-saffron-200/40 shadow-[0_1px_0_rgba(180,87,28,.04)]">
      <div className="container-x flex items-center gap-3 py-3.5">
        {/* Logo: spool monogram + Fraunces wordmark */}
        <a id="logo" href="/" onClick={onLogoClick} title="psst… click me" className="flex items-center gap-2.5 shrink-0 group">
          <span className="relative grid place-items-center h-10 w-10 rounded-xl bg-ink text-cream shadow-sm border border-ink-soft transition-transform group-hover:rotate-[-6deg]">
            {/* Mini spool SVG instead of generic "SH" box */}
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <ellipse cx="12" cy="6" rx="5" ry="1.5" />
              <ellipse cx="12" cy="18" rx="5" ry="1.5" />
              <line x1="7" y1="6" x2="7" y2="18" />
              <line x1="17" y1="6" x2="17" y2="18" />
              <path d="M8 9 L16 11 M16 13 L8 15" opacity="0.6" />
            </svg>
            {/* Saffron stitch accent */}
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-saffron-500 border-2 border-cream" />
          </span>
          <span className="hidden sm:block leading-tight">
            <span className="block font-display font-semibold text-lg text-ink tracking-tight">SH Enterprises</span>
            <span className="block font-display italic text-[10px] text-saffron-600 tracking-wide -mt-0.5">Craft &amp; tailoring supplies</span>
          </span>
        </a>

        <div className="hidden md:block flex-1 max-w-xl">
          <SearchBox placeholder={t("search_placeholder")} submitLabel={t("search")} />
        </div>
        <div className="md:hidden flex-1 max-w-sm">
          <SearchBox placeholder={t("search_placeholder_short")} submitLabel={t("search")} />
        </div>

        <nav className="ml-auto flex items-center gap-3 text-sm font-semibold shrink-0">
          <LanguageSwitcher compact />
          <Link href="/shop" className="hover:text-saffron-700 hidden sm:block text-ink-soft transition-colors">Shop</Link>
          <Link href="/offers" className="hover:text-saffron-700 hidden sm:block text-ink-soft transition-colors">{t("offers")}</Link>
          <Link
            href="/ai-helper"
            className="hidden md:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-saffron-500 to-saffron-600 text-white text-xs font-bold hover:from-saffron-600 hover:to-saffron-700 transition-all shadow-sm hover:shadow"
            title="AI project helper"
          >
            ✨ AI Helper
          </Link>
          <Link href="/track" className="hover:text-saffron-700 hidden md:block text-ink-soft transition-colors">{t("track_my_order")}</Link>
          {me ? (
            <Link href="/account" className="hover:text-saffron-700 text-ink-soft transition-colors">{t("hi")}, {me.fullName.split(" ")[0]}</Link>
          ) : (
            <Link href="/account/login" className="hover:text-saffron-700 text-ink-soft transition-colors">{t("login")}</Link>
          )}
          <Link
            href="/cart"
            className="rounded-lg bg-ink hover:bg-ink-soft text-cream px-3.5 py-1.5 transition-colors relative flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h2l2 10h10l2-7H6" />
              <circle cx="9" cy="17" r="1" fill="currentColor" />
              <circle cx="16" cy="17" r="1" fill="currentColor" />
            </svg>
            <span>{t("cart")}</span>
            {count > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-saffron-500 text-white text-xs ml-0.5">{count}</span>
            )}
          </Link>
          <button onClick={() => setOpen(v => !v)} className="md:hidden text-ink-soft" aria-label="Menu">☰</button>
        </nav>
      </div>

      {/* Tape measure egg target */}
      <div id="tape">
        <div className="ruler">
          <span className="pl-2 pb-0.5">0&nbsp;&nbsp;&nbsp;10&nbsp;&nbsp;&nbsp;20&nbsp;&nbsp;&nbsp;30&nbsp;&nbsp;&nbsp;40&nbsp;&nbsp;&nbsp;50&nbsp;&nbsp;&nbsp;60&nbsp;&nbsp;&nbsp;70&nbsp;&nbsp;&nbsp;80&nbsp;&nbsp;&nbsp;90&nbsp;&nbsp;&nbsp;100 cm — measured with love ✂</span>
        </div>
      </div>

      {/* Category strip — refined, on ivory band with subtle stitched bottom border */}
      <div
        className="border-t border-saffron-200/40 bg-ivory/60 relative"
        style={{
          backgroundImage:
            "linear-gradient(to right, transparent 0 8px, rgba(184,119,47,.25) 8px 14px, transparent 14px 22px)",
          backgroundSize: "22px 1px",
          backgroundPosition: "0 100%",
          backgroundRepeat: "repeat-x",
        }}
      >
        <div className="container-x">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-2.5">
            {categories.map(c => {
              const active = pathname === `/category/${c.slug}`;
              return (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className={`shrink-0 font-display text-sm font-semibold px-3.5 py-1.5 rounded-full transition-all ${
                    active
                      ? "bg-ink text-cream shadow-sm"
                      : "text-ink-soft hover:bg-saffron-100 hover:text-saffron-800"
                  }`}
                >
                  {catName(c)}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-saffron-200/40 bg-cream p-4 space-y-3 shadow-inner">
          <div className="flex flex-col gap-3 text-sm font-semibold">
            <Link href="/shop" className="text-ink-soft hover:text-saffron-700">Shop all</Link>
            <Link href="/offers" className="text-ink-soft hover:text-saffron-700">{t("offers")}</Link>
            <Link href="/ai-helper" className="text-saffron-700 font-bold flex items-center gap-1">✨ AI Project Helper</Link>
            <Link href="/track" className="text-ink-soft hover:text-saffron-700">{t("track_my_order")}</Link>
          </div>
        </div>
      )}
    </header>
  );
}
