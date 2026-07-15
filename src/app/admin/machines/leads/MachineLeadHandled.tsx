"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MachineLeadHandled({ id, handled }: { id: number; handled: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/machines/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handled: !handled }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || "Update failed"); return; }
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`px-2.5 py-1 rounded text-xs disabled:opacity-50 ${handled ? "bg-brand-100 text-brand-600 hover:bg-brand-200" : "bg-green-600 text-white hover:bg-green-700"}`}
    >
      {busy ? "…" : handled ? "↺ Reopen" : "✓ Called"}
    </button>
  );
}
