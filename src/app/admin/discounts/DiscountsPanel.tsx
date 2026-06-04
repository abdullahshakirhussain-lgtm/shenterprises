"use client";
import { useState } from "react";
import Link from "next/link";

type Tier = { order: number; percent: number };

export default function DiscountsPanel({
  initialMemberDiscount,
  initialTiers,
}: {
  initialMemberDiscount: string;
  initialTiers: Tier[];
}) {
  const [memberDiscount, setMemberDiscount] = useState(initialMemberDiscount);
  const [tiers, setTiers] = useState<Tier[]>(initialTiers);
  const [newOrder, setNewOrder] = useState("");
  const [newPercent, setNewPercent] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true); setMsg("");
    const res = await fetch("/api/admin/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberDiscount, tiers }),
    });
    setSaving(false);
    setMsg(res.ok ? "Saved ✓" : "Save failed");
    setTimeout(() => setMsg(""), 3000);
  }

  function addTier() {
    const o = parseInt(newOrder);
    const p = parseFloat(newPercent);
    if (!o || o < 1 || isNaN(p) || p < 0 || p > 100) {
      setMsg("Enter a valid order number (≥1) and percent (0–100)");
      setTimeout(() => setMsg(""), 3000);
      return;
    }
    const updated = [...tiers.filter((t) => t.order !== o), { order: o, percent: p }]
      .sort((a, b) => a.order - b.order);
    setTiers(updated);
    setNewOrder(""); setNewPercent("");
  }

  function removeTier(order: number) {
    setTiers(tiers.filter((t) => t.order !== order));
  }

  function updateTierPercent(order: number, val: string) {
    setTiers(tiers.map((t) => t.order === order ? { ...t, percent: parseFloat(val) || 0 } : t));
  }

  const ordinalLabel = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className="space-y-6">
      {/* Member discount */}
      <section className="card p-5">
        <h2 className="font-semibold mb-1">Member discount (ongoing)</h2>
        <p className="text-sm text-brand-600 mb-3">Applied to every order placed by a logged-in account. Override per-customer in Admin → Members.</p>
        <div className="flex items-center gap-3">
          <input type="number" min="0" max="100" step="0.1" className="input max-w-xs"
            value={memberDiscount} onChange={(e) => setMemberDiscount(e.target.value)} />
          <span className="text-brand-700">%</span>
        </div>
      </section>

      {/* New customer tiers */}
      <section className="card p-5">
        <h2 className="font-semibold mb-1">New customer order discounts</h2>
        <p className="text-sm text-brand-600 mb-4">
          Set a discount percent for a customer's 1st order, 2nd order, etc. Stacks on top of the member discount.
          Remove a tier by clicking ✕, or set it to 0% to effectively disable it.
        </p>

        {tiers.length > 0 ? (
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b border-brand-200 text-left">
                <th className="pb-2 font-medium">Order</th>
                <th className="pb-2 font-medium">Discount (%)</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.order} className="border-b border-brand-100">
                  <td className="py-2 text-brand-800 font-medium">{ordinalLabel(t.order)} order</td>
                  <td className="py-2">
                    <input type="number" min="0" max="100" step="0.1" className="input max-w-[100px]"
                      value={t.percent} onChange={(e) => updateTierPercent(t.order, e.target.value)} />
                    <span className="ml-1 text-brand-600">%</span>
                  </td>
                  <td className="py-2 text-right">
                    <button onClick={() => removeTier(t.order)} className="text-red-500 hover:text-red-700 text-lg leading-none">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-brand-500 mb-4 italic">No tiers configured. Add one below.</p>
        )}

        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="label text-xs">Order number</label>
            <input type="number" min="1" className="input w-28" placeholder="1" value={newOrder}
              onChange={(e) => setNewOrder(e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">Discount (%)</label>
            <input type="number" min="0" max="100" step="0.1" className="input w-28" placeholder="15" value={newPercent}
              onChange={(e) => setNewPercent(e.target.value)} />
          </div>
          <button onClick={addTier} className="btn-secondary">Add tier</button>
        </div>
        <p className="text-xs text-brand-500 mt-2">
          Example: Order 1 = 15%, Order 2 = 10% means the customer's first order gets 15% off, second gets 10% off, and all subsequent orders only get the member discount.
        </p>
      </section>

      {/* Coupon codes link */}
      <section className="card p-5">
        <h2 className="font-semibold mb-1">Coupon codes</h2>
        <p className="text-sm text-brand-600 mb-3">Create single-use or multi-use coupon codes with fixed or percentage discounts, usage limits, and expiry dates.</p>
        <Link href="/admin/coupons" className="btn-secondary inline-block">Manage coupon codes →</Link>
      </section>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save discount settings"}</button>
        {msg && <span className={`text-sm ${msg.includes("✓") ? "text-green-700" : "text-red-600"}`}>{msg}</span>}
      </div>
    </div>
  );
}
