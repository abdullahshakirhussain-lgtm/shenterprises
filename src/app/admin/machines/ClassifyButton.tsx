"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** One-click AI type assignment for machines missing a category. */
export default function ClassifyButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/machines/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlyMissing: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { alert(j.error || "Classification failed"); return; }
      const skipped = j.unassigned?.length || 0;
      alert(`Assigned ${j.assigned?.length ?? 0} of ${j.total ?? 0} machine(s).${skipped ? ` ${skipped} left unassigned — set those manually.` : ""}`);
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <button onClick={run} disabled={busy} className="btn-secondary disabled:opacity-50">
      {busy ? "Classifying…" : "🏷 Auto-assign types"}
    </button>
  );
}
