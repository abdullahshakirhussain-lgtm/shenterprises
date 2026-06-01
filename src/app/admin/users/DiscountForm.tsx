"use client";
import { useState } from "react";

export default function UserDiscountForm({ userId, initial }: { userId: number; initial: number }) {
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(false);
  async function save() {
    const res = await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ discountRate: v }) });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 1200); }
  }
  return (
    <div className="flex items-center gap-2">
      <input type="number" min="0" max="100" step="0.1" className="input w-20" value={v} onChange={(e) => setV(parseFloat(e.target.value) || 0)} onBlur={save} />
      {saved && <span className="text-xs text-green-700">✓</span>}
    </div>
  );
}
