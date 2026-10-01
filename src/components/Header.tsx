"use client";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { useEffect, useRef, useState } from "react";
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
  // The /catalog page is a self-contained "WhatsApp-style" experience —
  // the regular nav + category strip would lure customers out of it
  const isCatalog = pathname?.startsWith("/catalog");

  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<{ fullName: string } | null>(null);

  // Category strip horizontal scroll state — drives the </> arrow visibility
  const stripRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [categories.length]);
  function scrollStrip(dir: 1 | -1) {
    stripRef.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
  }

  // Cart bump animation — fires whenever the count increases
  const prevCount = useRef(count);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (count > prevCount.current) {
      setBump(true);
      const tm = setTimeout(() => setBump(false), 600);
      prevCount.current = count;
      return () => clearTimeout(tm);
    }
    prevCount.current = count;
  }, [count]);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setMe(d.user));
  }, []);

  // Close mobile menu when route changes
  useEffect(() => { setOpen(false); }, [pathname]);

  function onLogoClick(e: React.MouseEvent) {
    e.preventDefault();
    window.dispatchEvent(new Event("sh:logo"));
    setTimeout(() => { window.location.href = "/"; }, 50);
  }

  if (isAdmin || isCatalog) return null;

  return (
    <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur border-b border-saffron-200/40 shadow-[0_1px_0_rgba(180,87,28,.04)]">
      <div className="container-x flex items-center gap-2 sm:gap-3 py-3 sm:py-3.5">
        {/* Logo */}
        <Link id="logo" href="/" onClick={onLogoClick} title="psst… click me" className="flex items-center gap-2 sm:gap-2.5 shrink-0 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-header.webp"
            alt="SH Enterprises"
            width={190}
            height={128}
            className="h-10 sm:h-12 w-auto transition-transform group-hover:rotate-[-6deg]"
          />
          <span className="hidden sm:block leading-tight">
            <span className="block font-display italic text-[10px] text-saffron-600 tracking-wide">Craft &amp; tailoring supplies</span>
          </span>
        </Link>

        {/* Search — narrower on mobile to leave room for icons */}
        <div className="hidden lg:block flex-1 max-w-xl">
          <SearchBox placeholder={t("search_placeholder")} submitLabel={t("search")} />
        </div>
        <div className="lg:hidden flex-1 min-w-0">
          <SearchBox placeholder={t("search_placeholder_short")} submitLabel={t("search")} />
        </div>

        {/* Desktop nav */}
        <nav className="ml-auto hidden lg:flex items-center gap-3 text-sm font-semibold shrink-0">
          <LanguageSwitcher compact />
          <Link
            href="/machines"
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border font-bold transition-colors ${
              pathname?.startsWith("/machines")
                ? "bg-ink text-cream border-ink"
                : "border-ink/20 text-ink hover:bg-ink hover:text-cream"
            }`}
          >
            <GearIcon /> Machines
          </Link>
          <Link href="/offers" className="hover:text-saffron-700 text-ink-soft transition-colors">{t("offers")}</Link>
          <Link href="/track" className="hover:text-saffron-700 text-ink-soft transition-colors">{t("track_my_order")}</Link>
          {me ? (
            <Link href="/account" className="hover:text-saffron-700 text-ink-soft transition-colors">{t("hi")}, {me.fullName.split(" ")[0]}</Link>
          ) : (
            <Link href="/account/login" className="hover:text-saffron-700 text-ink-soft transition-colors">{t("login")}</Link>
          )}
          <CartButton count={count} bump={bump} label={t("cart")} />
        </nav>

        {/* Mobile actions — only what fits: cart + hamburger */}
        <div className="ml-auto flex lg:hidden items-center gap-1.5 shrink-0">
          <CartButton count={count} bump={bump} label={t("cart")} compact />
          <button
            onClick={() => setOpen(v => !v)}
            className="grid place-items-center h-10 w-10 rounded-lg bg-white border border-saffron-200 text-ink-soft hover:bg-saffron-50 transition-colors"
            aria-label={t("menu")}
          >
            {open ? (
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4 L16 16 M16 4 L4 16" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="17" y2="6" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="14" x2="17" y2="14" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Tape measure egg target */}
      <div id="tape">
        <div className="ruler">
          <span className="pl-2 pb-0.5">0&nbsp;&nbsp;&nbsp;10&nbsp;&nbsp;&nbsp;20&nbsp;&nbsp;&nbsp;30&nbsp;&nbsp;&nbsp;40&nbsp;&nbsp;&nbsp;50&nbsp;&nbsp;&nbsp;60&nbsp;&nbsp;&nbsp;70&nbsp;&nbsp;&nbsp;80&nbsp;&nbsp;&nbsp;90&nbsp;&nbsp;&nbsp;100 cm — measured with love ✂</span>
        </div>
      </div>

      {/* Category strip — hidden when mobile menu is open to reduce noise */}
      {!open && (
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
          <div className="container-x relative">
            {/* Left arrow + fade — only visible when there's more to the left */}
            {canScrollLeft && (
              <>
                <div aria-hidden className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-r from-ivory via-ivory/70 to-transparent" />
                <button
                  type="button"
                  onClick={() => scrollStrip(-1)}
                  aria-label="Scroll categories left"
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 grid place-items-center rounded-full bg-white border border-saffron-300 text-ink hover:bg-saffron-50 hover:border-saffron-500 shadow-sm transition-colors"
                >
                  <span className="text-sm font-bold leading-none" aria-hidden>&lsaquo;</span>
                </button>
              </>
            )}

            <div ref={stripRef} className="flex gap-1.5 overflow-x-auto no-scrollbar py-2.5 scroll-smooth">
              {/* Shop everything — first chip, always visible regardless of language */}
              <Link
                href="/shop"
                className={`shrink-0 font-display text-sm font-semibold px-3.5 py-1.5 rounded-full transition-all border ${
                  pathname === "/shop"
                    ? "bg-ink text-cream border-ink shadow-sm"
                    : "border-saffron-300 text-saffron-800 bg-white hover:bg-saffron-50"
                }`}
              >
                ✦ {t("shop_everything")}
              </Link>
              {/* Machines — dark accent chip so the high-value line is a prominent,
                  site-wide entry point, not lost among product categories. */}
              <Link
                href="/machines"
                className={`shrink-0 inline-flex items-center gap-1 font-display text-sm font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
                  pathname?.startsWith("/machines")
                    ? "bg-saffron-500 text-white border-saffron-500 shadow-sm"
                    : "bg-ink text-cream border-ink hover:bg-ink-soft"
                }`}
              >
                <GearIcon /> Machines
              </Link>
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

            {/* Right arrow + fade — only visible when there's more to the right */}
            {canScrollRight && (
              <>
                <div aria-hidden className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-l from-ivory via-ivory/70 to-transparent" />
                <button
                  type="button"
                  onClick={() => scrollStrip(1)}
                  aria-label="Scroll categories right"
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 grid place-items-center rounded-full bg-white border border-saffron-300 text-ink hover:bg-saffron-50 hover:border-saffron-500 shadow-sm transition-colors"
                >
                  <span className="text-sm font-bold leading-none" aria-hidden>&rsaquo;</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile drawer menu */}
      {open && (
        <div className="lg:hidden border-t border-saffron-200/40 bg-cream shadow-inner max-h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain">
          <div className="container-x py-4 space-y-1">
            <Link href="/shop" className="block py-2.5 px-3 rounded-lg text-ink font-display font-semibold text-base hover:bg-saffron-100 transition-colors">{t("shop_everything")}</Link>
            <Link href="/machines" className="flex items-center gap-2 py-2.5 px-3 rounded-lg bg-ink text-cream font-display font-semibold text-base transition-colors"><GearIcon /> Industrial machines</Link>
            <Link href="/offers" className="block py-2.5 px-3 rounded-lg text-ink font-display font-semibold text-base hover:bg-saffron-100 transition-colors">{t("offers")}</Link>
            {/* Product categories — previously only reachable via the sideways-scrolling strip */}
            {categories.length > 0 && (
              <div className="py-2 my-1 border-y border-saffron-200/50">
                <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[.18em] text-ink-mute">{t("categories")}</p>
                <div className="grid grid-cols-2 gap-x-2">
                  {categories.map(c => (
                    <Link key={c.slug} href={`/category/${c.slug}`} className="block py-2.5 px-3 rounded-lg text-ink-soft font-semibold text-[15px] hover:bg-saffron-100 transition-colors">{catName(c)}</Link>
                  ))}
                </div>
              </div>
            )}
            <Link href="/track" className="block py-2.5 px-3 rounded-lg text-ink font-display font-semibold text-base hover:bg-saffron-100 transition-colors">{t("track_my_order")}</Link>
            {me ? (
              <Link href="/account" className="block py-2.5 px-3 rounded-lg text-ink font-display font-semibold text-base hover:bg-saffron-100 transition-colors">{t("hi")}, {me.fullName.split(" ")[0]}</Link>
            ) : (
              <Link href="/account/login" className="block py-2.5 px-3 rounded-lg text-ink font-display font-semibold text-base hover:bg-saffron-100 transition-colors">{t("login")}</Link>
            )}
            <div className="pt-2 mt-2 border-t border-saffron-200/50">
              <LanguageSwitcher compact />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function CartButton({ count, bump, label, compact }: { count: number; bump: boolean; label: string; compact?: boolean }) {
  return (
    <Link
      href="/cart"
      aria-label={label}
      className={`rounded-lg bg-ink hover:bg-ink-soft text-cream transition-all relative flex items-center gap-1.5 shadow-sm ${
        compact ? "h-10 w-10 grid place-items-center" : "px-3.5 py-1.5"
      } ${bump ? "cart-bump" : ""}`}
    >
      <svg className={compact ? "w-5 h-5" : "w-4 h-4"} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4h2l2 10h10l2-7H6" />
        <circle cx="9" cy="17" r="1" fill="currentColor" />
        <circle cx="16" cy="17" r="1" fill="currentColor" />
      </svg>
      {!compact && <span className="text-sm font-semibold">{label}</span>}
      {count > 0 && (
        <span
          className={`absolute ${compact ? "-top-1 -right-1" : "-top-1.5 -right-1.5"} inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-saffron-500 text-white text-xs font-bold ring-2 ring-cream`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

// Drawn gear for the Machines links (the ⚙ emoji rendered differently on every phone).
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1" />
    </svg>
  );
}
