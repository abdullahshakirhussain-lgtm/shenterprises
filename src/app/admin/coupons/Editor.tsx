"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Coupon = {
  id: number; code: string; type: string; value: number; minSubtotal: number;
  maxDiscount: number | null; usageLimit: number | null; usedCount: number;
  perUserLimit: number | null; expiresAt: string | null; active: boolean;
};

const EMPTY: Omit<Coupon, "id" | "usedCount"> = {
  code: "", type: "percent", value: 10, minSubtotal: 0,
  maxDiscount: null, usageLimit: null, perUserLimit: null, expiresAt: null, active: true
};

export default function CouponsEditor({ initial }: { initial: Coupon[] }) {
  const [coupons, setCoupons] = useState(initial);
  const [editing, setEditing] = useState<any>(null);
  const router = useRouter();

  async function save(c: any) {
    const isNew = !c.id;
    const url = isNew ? "/api/admin/coupons" : `/api/admin/coupons/${c.id}`;
    const res = await fetch(url, { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Save failed"); return; }
    setEditing(null);
    router.refresh();
  }
  async function del(id: number) {
    if (!confirm("Delete this coupon?")) return;
    const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    if (res.ok) { setCoupons(coupons.filter((c) => c.id !== id)); }
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setEditing({ ...EMPTY })} className="btn-primary">+ New coupon</button>

      {editing && (
        <div className="card p-5 max-w-2xl">
          <h2 className="font-semibold mb-3">{editing.id ? `Edit ${editing.code}` : "New coupon"}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">Code *</label><input className="input" value={editing.code} disabled={!!editing.id} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" /></div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                <option value="percent">% Percent off</option>
                <option value="fixed">Rs. Fixed amount</option>
              </select>
            </div>
            <div><label className="label">Value ({editing.type === "percent" ? "%" : "LKR"})</label><input type="number" min="0" step="0.01" className="input" value={editing.value} onChange={(e) => setEditing({ ...editing, value: parseFloat(e.target.value) || 0 })} /></div>
            <div><label className="label">Min subtotal (LKR)</label><input type="number" min="0" className="input" value={editing.minSubtotal} onChange={(e) => setEditing({ ...editing, minSubtotal: parseFloat(e.target.value) || 0 })} /></div>
            {editing.type === "percent" && (
              <div><label className="label">Max discount cap (LKR, optional)</label><input type="number" min="0" className="input" value={editing.maxDiscount ?? ""} onChange={(e) => setEditing({ ...editing, maxDiscount: e.target.value ? parseFloat(e.target.value) : null })} /></div>
            )}
            <div><label className="label">Total usage limit (optional)</label><input type="number" min="1" className="input" value={editing.usageLimit ?? ""} onChange={(e) => setEditing({ ...editing, usageLimit: e.target.value ? parseInt(e.target.value) : null })} /></div>
            <div><label className="label">Per-user limit (optional)</label><input type="number" min="1" className="input" value={editing.perUserLimit ?? ""} onChange={(e) => setEditing({ ...editing, perUserLimit: e.target.value ? parseInt(e.target.value) : null })} /></div>
            <div><label className="label">Expires on (optional)</label><input type="date" className="input" value={editing.expiresAt ?? ""} onChange={(e) => setEditing({ ...editing, expiresAt: e.target.value || null })} /></div>
            <label className="flex items-center gap-2 pt-6"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => save(editing)} className="btn-primary">Save</button>
            <button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-50"><tr className="text-left">
            <th className="p-2">Code</th><th className="p-2">Type</th><th className="p-2">Value</th>
            <th className="p-2">Min</th><th className="p-2">Used</th><th className="p-2">Expires</th><th className="p-2">Active</th><th></th>
          </tr></thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t border-brand-100">
                <td className="p-2 font-mono font-medium">{c.code}</td>
                <td className="p-2">{c.type === "percent" ? `${c.value}%` : `Rs. ${c.value}`}</td>
                <td className="p-2">{c.type === "percent" ? "—" : `Rs. ${c.value}`}</td>
                <td className="p-2">Rs. {c.minSubtotal}</td>
                <td className="p-2">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                <td className="p-2">{c.expiresAt || "—"}</td>
                <td className="p-2">{c.active ? "✓" : "✗"}</td>
                <td className="p-2 text-right">
                  <button onClick={() => setEditing({ ...c })} className="text-brand-700 underline text-sm mr-2">Edit</button>
                  <button onClick={() => del(c.id)} className="text-red-600 text-sm">Delete</button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-brand-600">No coupons yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
