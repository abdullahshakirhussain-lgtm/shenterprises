"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RebuildButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function go() {
    if (busy) return;
    if (!confirm("Rebuild all customer profiles from the last 90 days of activity? This may take 30–90 seconds.")) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/rebuild-profiles", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMsg(`✓ Rebuilt ${data.ok}/${data.total} profiles in ${(data.elapsedMs / 1000).toFixed(1)}s`);
      router.refresh();
    } catch (e: any) {
      setMsg("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {msg && (
        <span className={`text-xs ${msg.startsWith("✓") ? "text-green-700" : "text-red-700"}`}>
          {msg}
        </span>
      )}
      <button onClick={go} disabled={busy} className="btn-primary text-sm">
        {busy ? "Rebuilding…" : "Rebuild now"}
      </button>
    </div>
  );
}
