"use client";
import { useEffect, useState } from "react";

type TranslateStatus = {
  categories: { total: number; missing: number };
  variants:   { total: number; missing: number };
};

export default function AIToolsClient() {
  const [trStatus, setTrStatus] = useState<TranslateStatus | null>(null);
  const [trRunning, setTrRunning] = useState(false);
  const [trResult, setTrResult] = useState<string>("");

  async function loadTranslateStatus() {
    try {
      const res = await fetch("/api/admin/retranslate-all");
      if (!res.ok) return;
      const data = await res.json();
      setTrStatus(data);
    } catch {}
  }

  useEffect(() => { loadTranslateStatus(); }, []);

  async function retranslate(onlyMissing: boolean) {
    const msg = onlyMissing
      ? `Translate ${trStatus?.categories.missing ?? 0} categories + ${trStatus?.variants.missing ?? 0} variants that are missing Sinhala/Tamil translations?`
      : `Replace ALL Sinhala/Tamil translations for ${trStatus?.categories.total ?? 0} categories + ${trStatus?.variants.total ?? 0} variants? This re-runs Google Translate on every name and overwrites the stored values.`;
    if (!confirm(msg)) return;
    setTrRunning(true);
    setTrResult("");
    try {
      const res = await fetch("/api/admin/retranslate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlyMissing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setTrResult(
        `✓ Categories: ${data.categories.ok}/${data.categories.total} updated` +
        (data.categories.failed ? ` (${data.categories.failed} failed)` : "") +
        ` · Variants: ${data.variants.ok}/${data.variants.total} updated` +
        (data.variants.failed ? ` (${data.variants.failed} failed)` : "")
      );
      await loadTranslateStatus();
    } catch (e: any) {
      setTrResult("Error: " + e.message);
    } finally {
      setTrRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ===== Re-translate everything ===== */}
      <section className="card p-5 max-w-2xl">
        <h2 className="font-semibold text-lg text-brand-900">Re-translate names</h2>
        <p className="text-sm text-brand-600 mt-1">
          Refresh the Sinhala &amp; Tamil names on all categories and product variants using Google Translate.
          New items are translated automatically — use this to refresh existing translations (e.g. after switching translation providers, or to fill in missing ones).
        </p>

        {trStatus ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 rounded border border-brand-200 bg-white">
              <p className="text-xs text-brand-600 uppercase tracking-wide">Categories</p>
              <p className="font-display text-2xl font-bold text-brand-900">{trStatus.categories.total}</p>
              {trStatus.categories.missing > 0 ? (
                <p className="text-xs text-amber-700 mt-0.5">{trStatus.categories.missing} missing translations</p>
              ) : (
                <p className="text-xs text-green-700 mt-0.5">All translated</p>
              )}
            </div>
            <div className="p-3 rounded border border-brand-200 bg-white">
              <p className="text-xs text-brand-600 uppercase tracking-wide">Variants</p>
              <p className="font-display text-2xl font-bold text-brand-900">{trStatus.variants.total}</p>
              {trStatus.variants.missing > 0 ? (
                <p className="text-xs text-amber-700 mt-0.5">{trStatus.variants.missing} missing translations</p>
              ) : (
                <p className="text-xs text-green-700 mt-0.5">All translated</p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-brand-500">Loading…</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => retranslate(true)}
            disabled={trRunning || (trStatus ? trStatus.categories.missing + trStatus.variants.missing === 0 : true)}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            {trRunning ? "Translating…" : "Fill in missing only"}
          </button>
          <button
            onClick={() => retranslate(false)}
            disabled={trRunning}
            className="btn-primary text-sm"
          >
            {trRunning ? "Translating…" : "Re-translate everything"}
          </button>
        </div>

        {trResult && (
          <div className={`mt-3 p-3 rounded text-sm ${trResult.startsWith("✓") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            {trResult}
          </div>
        )}
        <p className="text-xs text-brand-500 mt-3 italic">
          Translation runs in batches of 4 in parallel. A large catalog can take 30–90 seconds.
          Product main names aren&apos;t stored as translations — they always display in the original (English) name; only categories and variant names live in si/ta.
        </p>
      </section>
    </div>
  );
}
