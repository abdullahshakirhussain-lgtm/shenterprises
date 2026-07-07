"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MachineDeleteButton({ id, name }: { id: number; name: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function del() {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/machines/${id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || "Delete failed"); return; }
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <button onClick={del} disabled={busy} className="px-2.5 py-1 rounded bg-red-100 text-red-700 text-xs hover:bg-red-200 disabled:opacity-50">
      {busy ? "…" : "Delete"}
    </button>
  );
}
