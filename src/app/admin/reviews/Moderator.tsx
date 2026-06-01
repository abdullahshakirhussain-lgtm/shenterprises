"use client";
import { useState } from "react";

type Row = { id: number; name: string; rating: number; title: string | null; body: string; approved: boolean; createdAt: string; productName: string; productSlug: string };

export default function ReviewModerator({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  async function toggle(id: number, approved: boolean) {
    const res = await fetch(`/api/admin/reviews/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approved }) });
    if (res.ok) setRows(rows.map((r) => r.id === id ? { ...r, approved } : r));
  }
  async function del(id: number) {
    if (!confirm("Delete this review?")) return;
    const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    if (res.ok) setRows(rows.filter((r) => r.id !== id));
  }
  return (
    <div className="space-y-3">
      {rows.length === 0 && <p className="text-brand-700">No reviews yet.</p>}
      {rows.map((r) => (
        <div key={r.id} className="card p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium">{r.name} <span className="text-amber-500">{"★".repeat(r.rating)}</span></div>
              <a href={`/product/${r.productSlug}`} target="_blank" className="text-sm text-brand-700 underline">{r.productName}</a>
              {r.title && <div className="font-semibold mt-1">{r.title}</div>}
              <p className="mt-1 text-sm whitespace-pre-line">{r.body}</p>
              <div className="text-xs text-brand-500 mt-1">{new Date(r.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button onClick={() => toggle(r.id, !r.approved)} className={`text-sm px-3 py-1 rounded border ${r.approved ? "border-green-300 bg-green-50 text-green-800" : "border-amber-300 bg-amber-50 text-amber-800"}`}>
                {r.approved ? "✓ Approved" : "Hidden"}
              </button>
              <button onClick={() => del(r.id)} className="text-sm text-red-600">Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
