"use client";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header({ categories }: { categories: { name: string; slug: string }[] }) {
  const { count } = useCart();
  const { t } = useLanguage();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isAdmin = pathname?.startsWith("/admin");

  // Hide the customer header entirely on admin pages — admin has its own
  if (isAdmin) return null;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [me, setMe] = useState<{ fullName: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setMe(d.user));
  }, []);

  function onLogoClick(e: React.MouseEvent) {
    // Easter egg: trigger tape-measure via global event
    e.preventDefault();
    window.dispatchEvent(new Event("sh:logo"));
    // Only navigate after a beat (so the tape can show on home)
    setTimeout(() => { window.location.href = "/"; }, 50);
  }

  return (
    <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur border-b border-brand-200/60">
      <div className="container-x flex items-center gap-3 py-3">
        <a id="logo" href="/" onClick={onLogoClick} title="psst… click me" className="flex items-center gap-2 shrink-0">
          <span className="grid place-items-center h-9 w-9 rounded-lg bg-brand-600 text-white font-serif font-bold text-sm">SH</span>
          <span className="font-serif font-semibold text-lg hidden sm:block text-ink">SH Enterprises</span>
        </a>

        <form action="/search" className="hidden md:flex flex-1 max-w-xl items-center rounded-lg border border-brand-200 bg-white overflow-hidden">
          <input name="q" value={q} onChange={e => setQ(e.target.value)}
            placeholder={t("search_placeholder")}
            className="flex-1 px-4 py-2.5 text-sm outline-none bg-transparent" />
          <button className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors">{t("search")}</button>
        </form>

        <nav className="ml-auto flex items-center gap-3 text-sm font-semibold shrink-0">
          <LanguageSwitcher compact />
          <Link href="/shop" className="hover:text-brand-600 hidden sm:block text-ink/80">Shop</Link>
          <Link href="/offers" className="hover:text-brand-600 hidden sm:block text-ink/80">{t("offers")}</Link>
          <Link href="/track" className="hover:text-brand-600 hidden md:block text-ink/80">{t("track_my_order")}</Link>
          {me ? (
            <Link href="/account" className="hover:text-brand-600 text-ink/80">{t("hi")}, {me.fullName.split(" ")[0]}</Link>
          ) : (
            <Link href="/account/login" className="hover:text-brand-600 text-ink/80">{t("login")}</Link>
          )}
          <Link href="/cart" className="rounded-lg border border-brand-600 text-brand-700 px-3 py-1.5 hover:bg-brand-50 transition-colors relative">
            {t("cart")}
            {count > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-brand-600 text-white text-xs">{count}</span>
            )}
          </Link>
          <button onClick={() => setOpen(v => !v)} className="md:hidden text-ink/80" aria-label="Menu">☰</button>
        </nav>
      </div>

      {/* Tape measure egg target — slides down on logo click */}
      <div id="tape">
        <div className="ruler">
          <span className="pl-2 pb-0.5">0&nbsp;&nbsp;&nbsp;10&nbsp;&nbsp;&nbsp;20&nbsp;&nbsp;&nbsp;30&nbsp;&nbsp;&nbsp;40&nbsp;&nbsp;&nbsp;50&nbsp;&nbsp;&nbsp;60&nbsp;&nbsp;&nbsp;70&nbsp;&nbsp;&nbsp;80&nbsp;&nbsp;&nbsp;90&nbsp;&nbsp;&nbsp;100 cm — measured with love ✂</span>
        </div>
      </div>

      <div className="border-t border-brand-100 bg-brand-50/50">
        <div className="container-x">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
            {categories.map(c => (
              <Link key={c.slug} href={`/category/${c.slug}`}
                className="shrink-0 text-sm px-3 py-1.5 rounded-full bg-white border border-brand-200 text-brand-800 hover:bg-brand-100 transition-colors">
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-brand-100 bg-white p-3 space-y-3">
          <form action="/search" className="flex">
            <input name="q" placeholder={t("search_placeholder_short")} className="input rounded-r-none" />
            <button className="btn-primary rounded-l-none">{t("search")}</button>
          </form>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/shop" className="text-ink/80">Shop all</Link>
            <Link href="/offers" className="text-ink/80">{t("offers")}</Link>
            <Link href="/track" className="text-ink/80">{t("track_my_order")}</Link>
          </div>
        </div>
      )}
    </header>
  );
}
