"use client";
import { useCart } from "@/components/CartProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { formatLKR } from "@/lib/utils";
import Link from "next/link";

export default function CartPage() {
  const { items, subtotal, setQty, remove, clear } = useCart();
  const { t } = useLanguage();
  return (
    <div className="container-x py-8">
      <h1 className="font-display text-3xl text-brand-900 mb-6">{t("your_cart")}</h1>
      {items.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl bg-white border border-saffron-200/60 shadow-md p-10 text-center stitched">
          <div className="text-5xl mb-3">🧺</div>
          <p className="font-display italic text-xl text-ink mb-2">{t("cart_empty")}</p>
          <p className="text-ink-mute text-sm mb-5">Find threads, trims, and tools to bring your next make to life.</p>
          <Link href="/shop" className="rounded-xl bg-ink hover:bg-ink-soft text-cream text-sm font-bold px-5 py-2.5 transition-colors">
            {t("continue_shopping")}
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            {items.map((i) => (
              <div key={i.key} className="card p-3 flex gap-3 items-center">
                <div className="w-20 h-20 bg-brand-50 rounded shrink-0 overflow-hidden">
                  {i.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.imageUrl} alt={i.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${i.slug}`} className="font-medium hover:text-brand-700 line-clamp-2">{i.name}</Link>
                  {i.variants && i.variants.length > 0 && (
                    <div className="text-xs text-brand-600 mt-0.5">
                      {i.variants.map(v => {
                        const label =
                          v.type === "color" ? t("color") :
                          v.type === "size" ? t("size") :
                          v.type === "length" ? t("length") :
                          "Pack";
                        return `${label}: ${v.name}`;
                      }).join(" · ")}
                    </div>
                  )}
                  <div className="text-sm text-brand-700">{formatLKR(i.price)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-secondary px-2 py-1" onClick={() => setQty(i.key, i.quantity - 1)}>−</button>
                  <span className="w-8 text-center">{i.quantity}</span>
                  <button className="btn-secondary px-2 py-1" onClick={() => setQty(i.key, i.quantity + 1)}>+</button>
                </div>
                <div className="w-24 text-right font-semibold">{formatLKR(i.price * i.quantity)}</div>
                <button onClick={() => remove(i.key)} className="text-red-600 px-2" aria-label={t("remove")}>✕</button>
              </div>
            ))}
            <button onClick={clear} className="text-sm text-brand-600 underline">{t("clear_cart")}</button>
          </div>
          <div className="card p-4 h-fit">
            <h2 className="font-semibold text-lg mb-3">{t("order_summary")}</h2>
            <div className="flex justify-between mb-2"><span>{t("subtotal")}</span><span>{formatLKR(subtotal)}</span></div>
            <Link href="/checkout" className="btn-primary w-full">{t("proceed_to_checkout")}</Link>
          </div>
        </div>
      )}
    </div>
  );
}
