"use client";
import { useState } from "react";

type Row = { id: number; name: string; deliveryFee: number };

export default function DeliveryEditor({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [saved, setSaved] = useState<number | null>(null);

  async function save(r: Row) {
    const res = await fetch(`/api/admin/districts/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryFee: r.deliveryFee })
    });
    if (res.ok) { setSaved(r.id); setTimeout(() => setSaved(null), 1200); }
  }

  return (
    <div className="card p-5 max-w-xl">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-brand-600"><th>District</th><th>Fee (LKR)</th><th></th></tr></thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.id} className="border-t border-brand-100">
              <td className="py-2">{r.name}</td>
              <td>
                <input type="number" min="0" step="0.01" className="input w-32"
                  value={r.deliveryFee}
                  onChange={(e) => { const v = parseFloat(e.target.value) || 0; const next = [...rows]; next[idx] = { ...r, deliveryFee: v }; setRows(next); }}
                  onBlur={() => save(rows[idx])} />
              </td>
              <td className="text-sm text-green-700">{saved === r.id ? "Saved ✓" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
