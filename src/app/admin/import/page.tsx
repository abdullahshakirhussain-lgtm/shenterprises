"use client";
import { useState } from "react";

type Preview = { headers: string[]; rows: Record<string, string>[] };

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [useAI, setUseAI] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function loadPreview() {
    if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/admin/import/preview", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "Preview failed"); return; }
    setPreview(data);
  }

  async function runImport() {
    if (!file) return;
    setBusy(true); setErr(""); setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("useAI", useAI ? "1" : "0");
    if (customPrompt) fd.append("customPrompt", customPrompt);
    const res = await fetch("/api/admin/import", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error || "Import failed"); return; }
    setResult(data);
  }

  return (
    <div className="container-x py-6 max-w-3xl">
      <h1 className="font-display text-2xl text-brand-900 mb-2">Import products from CSV</h1>
      <p className="text-sm text-brand-700 mb-4">
        Direct mapping expects columns: <code>name, description, price, sale_price, sku, stock, category</code>.
        Enable AI extraction below to auto-map messier CSVs using DeepSeek.
      </p>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">CSV file</label>
          <input type="file" accept=".csv,text/csv" onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null); setResult(null); }} className="input" />
        </div>
        {file && <button onClick={loadPreview} className="btn-secondary">Preview first 5 rows</button>}

        {preview && (
          <div className="overflow-x-auto">
            <div className="text-xs text-brand-600 mb-1">Headers: {preview.headers.join(", ")}</div>
            <table className="text-xs">
              <thead><tr>{preview.headers.map((h) => <th key={h} className="border px-2 py-1 bg-brand-50">{h}</th>)}</tr></thead>
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={i}>{preview.headers.map((h) => <td key={h} className="border px-2 py-1">{r[h]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <label className="flex items-center gap-2"><input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} /> Use DeepSeek AI to clean & extract fields</label>
        {useAI && (
          <div>
            <label className="label">Custom extraction prompt (overrides default for this import)</label>
            <textarea rows={4} className="input" placeholder="Leave empty to use the default prompt from Settings" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} />
          </div>
        )}

        {err && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{err}</div>}
        {result && (
          <div className="text-sm bg-green-50 border border-green-200 p-3 rounded">
            <div>✅ Imported: <strong>{result.imported}</strong></div>
            <div>⚠ Skipped: {result.skipped}</div>
            {result.errors.length > 0 && (
              <details className="mt-1"><summary>{result.errors.length} errors</summary>
                <ul className="list-disc list-inside text-xs">{result.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}</ul>
              </details>
            )}
          </div>
        )}

        <button disabled={!file || busy} onClick={runImport} className="btn-primary">{busy ? "Importing…" : "Run import"}</button>
      </div>
    </div>
  );
}
