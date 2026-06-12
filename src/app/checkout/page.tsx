"use client";
import { useCart } from "@/components/CartProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { formatLKR } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type District = { id: number; name: string; deliveryFee: number; cities: { id: number; name: string }[] };
type BankInfo = { bank_name?: string; bank_account_name?: string; bank_account_number?: string; bank_branch?: string };
type Me = { id: number; fullName: string; phone: string; discountRate: number } | null;

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { t } = useLanguage();
  const router = useRouter();
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtName, setDistrictName] = useState("");
  const [cityName, setCityName] = useState("");
  const [fee, setFee] = useState<number | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [bank, setBank] = useState<BankInfo>({});
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank">("cod");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [me, setMe] = useState<Me>(null);
  const [accountBannerDismissed, setAccountBannerDismissed] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", addressLine1: "", addressLine2: "", notes: "" });

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);

  useEffect(() => {
    fetch("/api/districts").then((r) => r.json()).then(setDistricts).catch(() => {});
    fetch("/api/settings/public").then((r) => r.json()).then(setBank).catch(() => {});
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      setMe(d.user);
      if (d.user) setForm((f) => ({ ...f, fullName: d.user.fullName, phone: d.user.phone }));
    });
    fetch("/api/analytics", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "begin_checkout", value: subtotal })
    }).catch(() => {});
  }, []); // eslint-disable-line

  const cities = useMemo(() => districts.find((d) => d.name === districtName)?.cities || [], [districts, districtName]);

  // discounts
  const accountDiscount = me && me.discountRate > 0 ? Math.round(subtotal * (me.discountRate / 100) * 100) / 100 : 0;
  const subtotalAfterAccount = Math.max(0, subtotal - accountDiscount);
  const couponDiscount = appliedCoupon?.discount || 0;
  const discountedSubtotal = Math.max(0, subtotalAfterAccount - couponDiscount);

  useEffect(() => {
    if (!districtName || !cityName) { setFee(null); return; }
    setFeeLoading(true);
    fetch("/api/delivery-fee", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ district: districtName, city: cityName, subtotal: discountedSubtotal })
    })
      .then((r) => r.json())
      .then((d) => setFee(typeof d.fee === "number" ? d.fee : null))
      .catch(() => setFee(null))
      .finally(() => setFeeLoading(false));
  }, [districtName, cityName, discountedSubtotal]);

  // re-validate coupon when subtotal changes
  useEffect(() => {
    if (appliedCoupon) applyCouponCode(appliedCoupon.code, true);
    // eslint-disable-next-line
  }, [subtotalAfterAccount]);

  const total = discountedSubtotal + (fee || 0);

  async function applyCouponCode(code: string, silent = false) {
    if (!code.trim()) return;
    if (!silent) setCouponMsg("");
    const res = await fetch("/api/coupons/validate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal: subtotalAfterAccount })
    });
    const data = await res.json();
    if (data.ok) {
      setAppliedCoupon({ code: data.code, discount: data.discount });
      setCouponMsg(`✓ Coupon applied: -${formatLKR(data.discount)}`);
    } else {
      setAppliedCoupon(null);
      setCouponMsg(data.reason || "Invalid coupon");
    }
  }
  function removeCoupon() { setAppliedCoupon(null); setCouponInput(""); setCouponMsg(""); }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (items.length === 0) { setError("Cart is empty."); return; }
    if (!districtName || !cityName) { setError("Please select district and city."); return; }
    if (paymentMethod === "bank" && !slipFile) { setError("Please upload your bank deposit slip."); return; }

    setSubmitting(true);
    try {
      let bankSlipUrl: string | undefined;
      if (slipFile) {
        const fd = new FormData(); fd.append("file", slipFile);
        const up = await fetch("/api/upload-slip", { method: "POST", body: fd });
        const j = await up.json();
        if (!up.ok) throw new Error(j.error || "Slip upload failed");
        bankSlipUrl = j.url;
      }

      const res = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form, districtName, cityName, paymentMethod, bankSlipUrl,
          couponCode: appliedCoupon?.code,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            variantLabel: i.variants && i.variants.length > 0
              ? i.variants.map(v => v.name).join(", ")
              : undefined,
            variantIds: i.variants?.map(v => v.id),
          }))
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order failed");
      clear();
      router.push(`/checkout/success?order=${encodeURIComponent(data.orderNumber)}`);
    } catch (err: any) { setError(err.message); } finally { setSubmitting(false); }
  }

  if (items.length === 0) {
    return (
      <div className="container-x py-16 text-center">
        <p className="text-brand-700 mb-4">{t("cart_empty")}</p>
        <Link href="/" className="btn-primary">{t("continue_shopping")}</Link>
      </div>
    );
  }

  return (
    <div className="container-x py-8">
      <h1 className="font-display text-3xl text-brand-900 mb-6">{t("checkout")}</h1>

      {!me && !accountBannerDismissed && (
        <div className="card p-4 mb-4 bg-brand-50 border border-brand-200 flex flex-wrap gap-2 items-center justify-between">
          <span className="text-sm">💡 <Link href="/account/login?next=/checkout" className="underline text-brand-700">{t("log_in")}</Link> · <Link href="/account/register?next=/checkout" className="underline text-brand-700">{t("create_account")}</Link> <span className="text-brand-500">{t("optional_guest")}</span></span>
          <button onClick={() => setAccountBannerDismissed(true)} className="text-brand-400 hover:text-brand-700 text-lg leading-none ml-2">✕</button>
        </div>
      )}

      <form onSubmit={placeOrder} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="card p-5">
            <h2 className="font-semibold text-lg mb-4">{t("contact_delivery")}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label">{t("full_name")} *</label><input required className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
              <div><label className="label">{t("phone")} *</label><input required className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className="label">{t("email")}</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className="label">{t("address_line1")} *</label><input required className="input" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className="label">{t("address_line2")}</label><input className="input" value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} /></div>
              <div>
                <label className="label">{t("district")} *</label>
                <select required className="input" value={districtName} onChange={(e) => { setDistrictName(e.target.value); setCityName(""); }}>
                  <option value="">{t("select_district")}</option>
                  {districts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t("city")} *</label>
                <select required className="input" value={cityName} onChange={(e) => setCityName(e.target.value)} disabled={!districtName}>
                  <option value="">{t("select_city")}</option>
                  {cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><label className="label">{t("order_notes")}</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold text-lg mb-4">{t("payment_method")}</h2>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 p-3 border rounded cursor-pointer ${paymentMethod === "cod" ? "border-brand-500 bg-brand-50" : "border-brand-200"}`}>
                <input type="radio" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                <div>
                  <div className="font-medium">{t("cash_on_delivery")}</div>
                  <div className="text-sm text-brand-700">{t("cod_desc")}</div>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 border rounded cursor-pointer ${paymentMethod === "bank" ? "border-brand-500 bg-brand-50" : "border-brand-200"}`}>
                <input type="radio" checked={paymentMethod === "bank"} onChange={() => setPaymentMethod("bank")} className="mt-1" />
                <div className="flex-1">
                  <div className="font-medium">{t("bank_deposit")}</div>
                  <div className="text-sm text-brand-700">{t("bank_desc")}</div>
                  {paymentMethod === "bank" && (
                    <div className="mt-3 text-sm bg-white border border-brand-200 rounded p-3 space-y-1">
                      <div><strong>{t("payment")}:</strong> {bank.bank_name || "—"}</div>
                      <div>{bank.bank_account_name || "—"}</div>
                      <div>{bank.bank_account_number || "—"}</div>
                      <div>{bank.bank_branch || "—"}</div>
                      <div className="mt-2">
                        <label className="label">{t("upload_slip")} *</label>
                        <input type="file" accept="image/*,application/pdf" onChange={(e) => setSlipFile(e.target.files?.[0] || null)} className="input" />
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </section>
        </div>

        <aside className="card p-5 h-fit lg:sticky lg:top-24">
          <h2 className="font-semibold text-lg mb-3">{t("order_summary")}</h2>
          <div className="space-y-2 mb-3">
            {items.map((i) => (
              <div key={i.key} className="flex justify-between text-sm">
                <span className="flex-1 pr-2">
                  {i.name} × {i.quantity}
                  {i.variants && i.variants.length > 0 && (
                    <span className="block text-xs text-brand-500 mt-0.5">{i.variants.map(v => v.name).join(" · ")}</span>
                  )}
                </span>
                <span>{formatLKR(i.price * i.quantity)}</span>
              </div>
            ))}
          </div>
          <hr className="my-3" />
          <div className="flex justify-between text-sm"><span>{t("subtotal")}</span><span>{formatLKR(subtotal)}</span></div>
          {accountDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-700">
              <span>{t("member_discount")} ({me?.discountRate}%)</span>
              <span>−{formatLKR(accountDiscount)}</span>
            </div>
          )}

          <div className="mt-3">
            {appliedCoupon ? (
              <div className="flex items-center justify-between text-sm bg-green-50 border border-green-200 rounded p-2">
                <span>{t("coupon_applied")} <strong>{appliedCoupon.code}</strong> (−{formatLKR(appliedCoupon.discount)})</span>
                <button type="button" onClick={removeCoupon} className="text-red-600 text-xs">{t("remove")}</button>
              </div>
            ) : (
              <div>
                <label className="label">{t("coupon_code")}</label>
                <div className="flex gap-2">
                  <input className="input" placeholder={t("enter_code")} value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} />
                  <button type="button" onClick={() => applyCouponCode(couponInput)} className="btn-secondary">{t("apply")}</button>
                </div>
                {couponMsg && <p className={`text-xs mt-1 ${couponMsg.startsWith("✓") ? "text-green-700" : "text-red-700"}`}>{couponMsg}</p>}
              </div>
            )}
          </div>

          <div className="flex justify-between text-sm mt-3">
            <span>{t("delivery")}</span>
            <span>{feeLoading ? "…" : fee == null ? t("select_area") : fee === 0 ? t("free") : formatLKR(fee)}</span>
          </div>
          <hr className="my-3" />
          <div className="flex justify-between text-lg font-semibold"><span>{t("total")}</span><span>{formatLKR(total)}</span></div>
          {error && <div className="mt-3 text-sm text-red-700 bg-red-50 p-2 rounded">{error}</div>}
          <button disabled={submitting || fee == null} className="btn-primary w-full mt-4 disabled:opacity-50">
            {submitting ? t("placing_order") : t("place_order")}
          </button>
        </aside>
      </form>
    </div>
  );
}
