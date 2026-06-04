"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Footer({ phone, email, address }: { phone?: string; email?: string; address?: string }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <footer className="mt-16 border-t border-brand-100 bg-white">
      <div className="container-x py-10 grid gap-8 md:grid-cols-4">
        <div>
          <div className="font-display text-xl text-brand-900 mb-2">SH Enterprises</div>
          <p className="text-sm text-brand-800/80 mb-4">Quality craft &amp; tailoring supplies — threads, zippers, scissors, elastics, ribbons, buttons and more. Island-wide delivery in Sri Lanka.</p>
          <LanguageSwitcher />
        </div>
        <div>
          <div className="font-semibold mb-2 text-brand-900">{t("shop")}</div>
          <ul className="space-y-1 text-sm">
            <li><Link href="/category/threads">Threads</Link></li>
            <li><Link href="/category/zippers">Zippers</Link></li>
            <li><Link href="/category/buttons">Buttons</Link></li>
            <li><Link href="/offers">{t("offers")}</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2 text-brand-900">{t("help")}</div>
          <ul className="space-y-1 text-sm">
            <li><Link href="/shop">Shop all</Link></li>
            <li><Link href="/cart">{t("cart")}</Link></li>
            <li><Link href="/checkout">{t("checkout")}</Link></li>
            <li><Link href="/track">{t("track_my_order")}</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2 text-brand-900">{t("contact")}</div>
          <ul className="space-y-1 text-sm">
            {phone && <li>📞 {phone}</li>}
            {email && <li>✉️ {email}</li>}
            {address && <li>📍 {address}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-brand-100 py-4 text-center text-xs text-brand-700">
        © {new Date().getFullYear()} SH Enterprises. {t("all_rights")}
      </div>
    </footer>
  );
}
