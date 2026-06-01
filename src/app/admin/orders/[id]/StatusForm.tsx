"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = ["pending", "paid", "shipped", "delivered", "cancelled"];

export default function StatusForm({ orderId, current }: { orderId: number; current: string }) {
  const [status, setStatus] = useState(current);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setSaving(false);
    if (res.ok) router.refresh();
  }
  return (
    <div className="flex gap-2">
      <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
        {OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Update"}</button>
    </div>
  );
}
