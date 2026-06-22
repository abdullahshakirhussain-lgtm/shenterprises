"use client";
import { useEffect, useState } from "react";

type SamplePreview = { id: number; name: string; preview: string };
type Status = {
  ready: boolean;
  total?: number;
  embedded?: number;
  message?: string;
  extensionInstalled?: boolean;
  columnExists?: boolean;
  sample?: SamplePreview[];
};

export default function AIToolsClient() {
  const [status, setStatus] = useState<Status | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string>("");

  async function loadStatus(withSample = false) {
    setStatus(null);
    const res = await fetch(`/api/admin/regenerate-embeddings${withSample ? "?sample=1" : ""}`);
    const data = await res.json();
    setStatus(data);
  }

  useEffect(() => { loadStatus(false); }, []);

  async function regenerate() {
    if (!confirm("Regenerate embeddings for all active products? This may take 30–60 seconds and uses your OpenAI quota.")) return;
    setRunning(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/regenerate-embeddings", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(`✓ Embedded ${data.embedded} of ${data.total} products. Failed: ${data.failed}.`);
      await loadStatus();
    } catch (e: any) {
      setResult("Error: " + e.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-5 max-w-2xl">
        <h2 className="font-semibold text-lg text-brand-900">Product embeddings</h2>
        <p className="text-sm text-brand-600 mt-1">
          Vector embeddings let the AI Project Helper find products by meaning instead of just keywords.
          Each product is converted into a 1536-dimension vector and stored in PostgreSQL via the pgvector extension.
        </p>

        {!status ? (
          <p className="mt-4 text-sm text-brand-500">Checking status…</p>
        ) : !status.ready ? (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded">
            <p className="font-medium text-amber-900">Not set up yet</p>

            {/* Diagnostic — show what we found */}
            {(status.extensionInstalled !== undefined || status.columnExists !== undefined) && (
              <div className="mt-2 text-xs font-mono text-amber-900 bg-amber-100/60 rounded p-2 space-y-0.5">
                <div>vector extension installed: <strong>{status.extensionInstalled ? "✓ yes" : "✗ no"}</strong></div>
                <div>Product.embedding column exists: <strong>{status.columnExists ? "✓ yes" : "✗ no"}</strong></div>
                {status.message && <div className="text-red-800 mt-1">{status.message}</div>}
              </div>
            )}

            {status.extensionInstalled && status.columnExists ? (
              <div className="mt-3 text-sm text-amber-900">
                <p className="font-semibold">DB is set up but Railway can&apos;t see it.</p>
                <p className="mt-1">This is a stale-connection issue. Restart the Railway service:</p>
                <ol className="mt-1 list-decimal list-inside text-sm">
                  <li>Open Railway → your service</li>
                  <li>Click ⋯ (top right) → <strong>Restart</strong></li>
                  <li>Wait 30 seconds, then click Re-check below</li>
                </ol>
              </div>
            ) : (
              <>
                <p className="text-sm text-amber-800 mt-3">
                  Run this SQL in your Supabase SQL Editor first, then come back and click Re-check:
                </p>
                <pre className="mt-2 p-3 bg-amber-100 rounded text-xs font-mono text-amber-900 whitespace-pre-wrap">{`CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS embedding vector(1536);
CREATE INDEX IF NOT EXISTS idx_product_embedding
  ON "Product" USING ivfflat (embedding vector_cosine_ops);`}</pre>
              </>
            )}

            <button onClick={() => loadStatus(false)} className="mt-3 text-sm font-bold text-amber-900 underline">
              Re-check status
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded border border-brand-200 bg-white">
                <p className="text-xs text-brand-600 uppercase tracking-wide">Active products</p>
                <p className="font-display text-2xl font-bold text-brand-900">{status.total ?? 0}</p>
              </div>
              <div className="p-3 rounded border border-brand-200 bg-white">
                <p className="text-xs text-brand-600 uppercase tracking-wide">Embedded</p>
                <p className="font-display text-2xl font-bold text-brand-900">
                  {status.embedded ?? 0}
                  {status.total != null && status.total > 0 && (
                    <span className="text-sm text-brand-500 font-normal ml-2">
                      ({Math.round((status.embedded ?? 0) / status.total * 100)}%)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={regenerate}
              disabled={running}
              className="btn-primary"
            >
              {running ? "Regenerating…" : "Regenerate all embeddings"}
            </button>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => loadStatus(true)}
                className="text-sm font-bold text-brand-700 underline hover:text-brand-900"
              >
                View sample embeddings →
              </button>
            </div>

            {status.sample && status.sample.length > 0 && (
              <div className="border border-brand-200 rounded p-3 bg-brand-50/40 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Sample (first 5 products)</p>
                <div className="space-y-1.5">
                  {status.sample.map(s => (
                    <div key={s.id} className="text-xs font-mono bg-white rounded p-2 border border-brand-100">
                      <div className="font-bold text-brand-900 not-italic mb-0.5">#{s.id} · {s.name}</div>
                      <div className="text-brand-600 break-all">{s.preview}…</div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-brand-500 italic">
                  Each product&apos;s embedding is a 1536-number vector. We show only the first ~100 characters of each here so the page stays readable.
                </p>
              </div>
            )}

            {result && (
              <div className={`p-3 rounded text-sm ${result.startsWith("✓") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                {result}
              </div>
            )}

            <p className="text-xs text-brand-500">
              New products automatically get embeddings on save. Run this only after the initial setup, or to refresh after bulk edits.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
