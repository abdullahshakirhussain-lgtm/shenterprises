"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { formatLKR } from "@/lib/utils";

type OrderResult = {
  orderNumber: string;
  status: string;
  createdAt: string;
  fullName: string;
  phone: string;
  districtName: string;
  cityName: string;
  paymentMethod: string;
  subtotal: number;
  accountDiscount: number;
  tierDiscount: number;
  couponDiscount: number;
  deliveryFee: number;
  total: number;
  items: { name: string; quantity: number; price: number }[];
};

const STATUS_STEPS = ["pending", "paid", "processing", "shipped", "delivered"];

export default function TrackForm() {
  const { t } = useLanguage();
  const sp = useSearchParams();
  const [query, setQuery] = useState(sp.get("order") || "");
  const [result, setResult] = useState<OrderResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  async function track(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setNotFound(false); setResult(null);
    const res = await fetch(`/api/track?order=${encodeURIComponent(query.trim())}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok || !data.order) { setNotFound(true); return; }
    setResult(data.order);
  }

  const stepIndex = result ? STATUS_STEPS.indexOf(result.status) : -1;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-display text-3xl text-brand-900">{t("track_order")}</h1>
        <p className="text-brand-600 mt-2">{t("track_subtitle")}</p>
      </div>

      <form onSubmit={track} className="card p-5 space-y-3">
        <div>
          <label className="label">{t("order_number_label")}</label>
          <input className="input" placeholder="e.g. SH-A1B2C3" value={query}
            onChange={e => setQuery(e.target.value.toUpperCase())} autoFocus />
        </div>
        <button disabled={loading || !query.trim()} className="btn-primary w-full">
          {loading ? t("tracking") : t("track")}
        </button>
      </form>

      {notFound && (
        <div className="card p-4 text-center text-red-700 bg-red-50">{t("order_not_found")}</div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Status timeline */}
          <div className="card p-5">
            <h2 className="font-semibold mb-4">{t("order_status")} — #{result.orderNumber}</h2>
            {result.status === "cancelled" ? (
              <div className="text-red-700 bg-red-50 rounded p-3 text-sm font-medium">⛔ {t("cancelled")}</div>
            ) : (
              <div className="relative">
                <div className="absolute top-4 left-4 right-4 h-0.5 bg-brand-100" />
                <div className="flex justify-between relative">
                  {STATUS_STEPS.map((s, i) => (
                    <div key={s} className="flex flex-col items-center gap-1 z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                        i < stepIndex ? "bg-brand-600 border-brand-600 text-white"
                        : i === stepIndex ? "bg-white border-brand-600 text-brand-600"
                        : "bg-white border-brand-200 text-brand-300"
                      }`}>
                        {i < stepIndex ? "✓" : i + 1}
                      </div>
                      <span className={`text-xs text-center max-w-[60px] ${i <= stepIndex ? "text-brand-800 font-medium" : "text-brand-400"}`}>
                        {t(s as any)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 text-xs text-brand-500">
              Placed {new Date(result.createdAt).toLocaleString()}
            </div>
          </div>

          {/* Items */}
          <div className="card p-5">
            <h2 className="font-semibold mb-3">{t("items_ordered")}</h2>
            <div className="space-y-2">
              {result.items.map((it, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{it.name} × {it.quantity}</span>
                  <span>{formatLKR(it.price * it.quantity)}</span>
                </div>
              ))}
            </div>
            <hr className="my-3" />
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span>{t("subtotal")}</span><span>{formatLKR(result.subtotal)}</span></div>
              {result.accountDiscount > 0 && <div className="flex justify-between text-green-700"><span>{t("member_discount")}</span><span>−{formatLKR(result.accountDiscount)}</span></div>}
              {result.tierDiscount > 0 && <div className="flex justify-between text-green-700"><span>{t("tier_discount")}</span><span>−{formatLKR(result.tierDiscount)}</span></div>}
              {result.couponDiscount > 0 && <div className="flex justify-between text-green-700"><span>{t("coupon_applied")}</span><span>−{formatLKR(result.couponDiscount)}</span></div>}
              <div className="flex justify-between"><span>{t("delivery")}</span><span>{result.deliveryFee === 0 ? t("free") : formatLKR(result.deliveryFee)}</span></div>
              <div className="flex justify-between font-semibold text-base pt-1 border-t border-brand-100"><span>{t("total")}</span><span>{formatLKR(result.total)}</span></div>
            </div>
          </div>

          {/* Delivery info */}
          <div className="card p-5">
            <h2 className="font-semibold mb-2">{t("delivery_info")}</h2>
            <div className="text-sm text-brand-700 space-y-1">
              <div>{result.fullName}</div>
              <div>{result.cityName}, {result.districtName}</div>
              <div className="mt-2">{t("payment")}: <strong>{result.paymentMethod === "cod" ? t("cash_on_delivery") : t("bank_deposit")}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
