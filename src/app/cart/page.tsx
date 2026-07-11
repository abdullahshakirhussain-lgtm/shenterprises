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
              <div key={i.key} className="card p-3 flex gap-3">
                <Link href={`/product/${i.slug}`} className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-50 rounded shrink-0 overflow-hidden">
                  {i.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.imageUrl} alt={i.name} className="w-full h-full object-cover" />
                  )}
                </Link>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/product/${i.slug}`} className="font-medium text-sm sm:text-base hover:text-brand-700 line-clamp-2">{i.name}</Link>
                    <button onClick={() => remove(i.key)} className="text-red-500 hover:text-red-700 shrink-0 -mt-0.5 px-1" aria-label={t("remove")}>✕</button>
                  </div>
                  {i.variants && i.variants.length > 0 && (
                    <div className="text-xs text-brand-600">
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
                  <div className="text-xs text-brand-500">{formatLKR(i.price)} each</div>

                  {/* Bottom row: quantity stepper (left) + line total (right) */}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center rounded-lg border border-brand-200 overflow-hidden">
                      <button onClick={() => setQty(i.key, i.quantity - 1)} className="w-8 h-8 text-lg font-bold text-brand-700 hover:bg-brand-50" aria-label="Decrease">−</button>
                      <span className="w-9 text-center text-sm font-semibold">{i.quantity}</span>
                      <button onClick={() => setQty(i.key, i.quantity + 1)} className="w-8 h-8 text-lg font-bold text-brand-700 hover:bg-brand-50" aria-label="Increase">+</button>
                    </div>
                    <div className="font-semibold text-sm sm:text-base text-brand-800 tabular-nums">{formatLKR(i.price * i.quantity)}</div>
                  </div>
                </div>
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
