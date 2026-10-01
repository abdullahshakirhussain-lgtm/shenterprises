"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import LanguageSwitcher from "./LanguageSwitcher";

// Footer links get vertical padding so each is a comfortable (~36px) tap target.
const linkCls = "inline-block py-1.5 hover:text-saffron-700 transition-colors";
const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 text-saffron-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);
const PHONE = "M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2";
const MAIL = "M3 6h18v12H3zM3 7l9 6 9-6";
const PIN = "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5";
const CLOCK = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2";
const CHAT = "M4 20l1.3-3.9A8 8 0 1 1 8 19.4z";

function waNumber(phone?: string) {
  const d = (phone || "").replace(/\D/g, "");
  const n = d.startsWith("0") ? "94" + d.slice(1) : d;
  return /^94\d{9}$/.test(n) ? n : null;
}

export default function Footer({ phone, email, address }: { phone?: string; email?: string; address?: string }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  const wa = waNumber(phone);
  return (
    <footer className="mt-16 border-t border-brand-100 bg-white">
      <div className="container-x py-10 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="font-display text-xl text-brand-900 mb-2">SH Enterprises</div>
          <p className="text-sm text-brand-800/80 mb-4">Quality craft &amp; tailoring supplies — threads, zippers, scissors, elastics, ribbons, buttons and more. Island-wide delivery in Sri Lanka.</p>
          <LanguageSwitcher />
        </div>
        <div>
          <div className="font-semibold mb-1 text-brand-900">{t("shop")}</div>
          <ul className="text-sm">
            <li><Link className={linkCls} href="/shop">Shop all</Link></li>
            <li><Link className={linkCls} href="/category/threads">Threads</Link></li>
            <li><Link className={linkCls} href="/category/zippers">Zippers</Link></li>
            <li><Link className={linkCls} href="/category/buttons">Buttons</Link></li>
            <li><Link className={linkCls} href="/machines">Industrial machines</Link></li>
            <li><Link className={linkCls} href="/offers">{t("offers")}</Link></li>
            <li><Link className={linkCls} href="/catalog">Quick catalog</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-1 text-brand-900">{t("help")}</div>
          <ul className="text-sm">
            <li><Link className={linkCls} href="/track">{t("track_my_order")}</Link></li>
            <li><Link className={linkCls} href="/delivery">Delivery information</Link></li>
            <li><Link className={linkCls} href="/returns">Returns &amp; refunds</Link></li>
            <li><Link className={linkCls} href="/privacy">Privacy policy</Link></li>
            <li><Link className={linkCls} href="/terms">Terms of sale</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-1 text-brand-900">{t("contact")}</div>
          <ul className="text-sm">
            {phone && <li><a className={linkCls + " inline-flex items-center gap-2"} href={`tel:${phone.replace(/\s/g, "")}`}><Icon d={PHONE} />{phone}</a></li>}
            {wa && <li><a className={linkCls + " inline-flex items-center gap-2"} href={`https://wa.me/${wa}`}><Icon d={CHAT} />WhatsApp us</a></li>}
            {email && <li><a className={linkCls + " inline-flex items-center gap-2"} href={`mailto:${email}`}><Icon d={MAIL} />{email}</a></li>}
            {address && <li className="py-1.5 flex items-start gap-2"><Icon d={PIN} /><span className="capitalize">{address}</span></li>}
            <li className="py-1.5 flex items-start gap-2"><Icon d={CLOCK} />Mon–Sat, 9.00–18.00</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-brand-100 py-4 text-center text-xs text-brand-700">
        © {new Date().getFullYear()} SH Enterprises. {t("all_rights")}
      </div>
    </footer>
  );
}
