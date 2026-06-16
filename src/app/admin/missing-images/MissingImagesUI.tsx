"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type MissingProduct = { id: number; name: string; slug: string; imageUrl: string; category: string | null };
type MissingVariant = { id: number; name: string; imageUrl: string; productId: number; productName: string; productSlug: string };

type Data = {
  productsTotal: number;
  productsMissing: number;
  variantsTotal: number;
  variantsMissing: number;
  missingProducts: MissingProduct[];
  missingVariants: MissingVariant[];
};

export default function MissingImagesUI() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"products" | "variants">("products");
  const [uploading, setUploading] = useState<string>("");
  const [migrating, setMigrating] = useState(false);
  const [migrationReport, setMigrationReport] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/missing-images");
      const d = await res.json();
      setData(d);
    } finally { setLoading(false); }
  }

  async function uploadForProduct(productId: number, file: File) {
    const key = `p-${productId}`;
    setUploading(key);
    try {
      const fd = new FormData(); fd.append("file", file);
      const up = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const j = await up.json();
      if (!up.ok) throw new Error(j.error || "Upload failed");

      const patch = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: j.url }),
      });
      if (!patch.ok) throw new Error("Failed to update product");

      // Remove the fixed row from the list
      setData(d => d ? ({ ...d, missingProducts: d.missingProducts.filter(p => p.id !== productId), productsMissing: d.productsMissing - 1 }) : d);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally { setUploading(""); }
  }

  async function uploadForVariant(variantId: number, file: File) {
    const key = `v-${variantId}`;
    setUploading(key);
    try {
      const fd = new FormData(); fd.append("file", file);
      const up = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const j = await up.json();
      if (!up.ok) throw new Error(j.error || "Upload failed");

      const patch = await fetch(`/api/admin/products/variants`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: variantId, imageUrl: j.url }),
      });
      if (!patch.ok) throw new Error("Failed to update variant");

      setData(d => d ? ({ ...d, missingVariants: d.missingVariants.filter(v => v.id !== variantId), variantsMissing: d.variantsMissing - 1 }) : d);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally { setUploading(""); }
  }

  async function runMigration() {
    if (!confirm("Scan the Railway volume for any surviving images and migrate them to R2? Safe to run multiple times.")) return;
    setMigrating(true); setMigrationReport(null);
    try {
      const res = await fetch("/api/admin/migrate-to-r2", { method: "POST" });
      const j = await res.json();
      setMigrationReport(j);
      // Refresh the missing list afterwards
      await load();
    } catch (e: any) {
      alert("Migration failed: " + e.message);
    } finally {
      setMigrating(false);
    }
  }

  if (loading) return <div className="text-brand-600">Scanning all images…</div>;
  if (!data) return <div className="text-red-600">Failed to load.</div>;

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <div className="card p-4">
          <div className="text-xs text-brand-600 uppercase">Products</div>
          <div className="text-2xl font-bold text-red-600">{data.productsMissing} <span className="text-base text-brand-500 font-normal">/ {data.productsTotal} missing</span></div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-brand-600 uppercase">Variants</div>
          <div className="text-2xl font-bold text-red-600">{data.variantsMissing} <span className="text-base text-brand-500 font-normal">/ {data.variantsTotal} missing</span></div>
        </div>
      </div>

      {/* One-shot migration tool */}
      <div className="card p-4 mb-6 bg-brand-50/40 border-brand-200">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="text-sm text-brand-800">
            <strong>Migrate Railway volume → R2.</strong> Scans the Railway disk for any surviving image files, uploads them to R2, and updates the database to point to the new R2 URLs. Safe to run multiple times — files already in R2 are simply re-uploaded (idempotent).
          </div>
          <button onClick={runMigration} disabled={migrating}
            className={`shrink-0 px-4 py-2 rounded font-medium text-sm ${migrating ? "bg-brand-300 text-white" : "bg-brand-700 text-white hover:bg-brand-800"}`}>
            {migrating ? "Migrating… (up to 5 min)" : "▶ Scan & migrate to R2"}
          </button>
        </div>
        {migrationReport && (
          <div className="mt-3 text-sm bg-white border border-brand-200 rounded p-3 space-y-1">
            <div>📁 Files found on volume: <strong>{migrationReport.filesFound}</strong></div>
            <div>📤 Uploaded to R2: <strong className="text-green-700">{migrationReport.filesUploaded}</strong></div>
            {migrationReport.filesSkipped > 0 && <div>⚠️ Skipped: <strong className="text-yellow-700">{migrationReport.filesSkipped}</strong></div>}
            <div>🔄 Products updated: <strong>{migrationReport.productsUpdated}</strong></div>
            <div>🔄 Variants updated: <strong>{migrationReport.variantsUpdated}</strong></div>
            <div>🔄 Banners updated: <strong>{migrationReport.bannersUpdated}</strong></div>
            {migrationReport.errors?.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-red-600">{migrationReport.errors.length} errors</summary>
                <ul className="mt-1 text-xs font-mono">
                  {migrationReport.errors.slice(0, 10).map((e: any, i: number) => (
                    <li key={i}>{e.file}: {e.error}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-brand-200 mb-4">
        <button onClick={() => setTab("products")} className={`pb-2 px-1 text-sm font-medium border-b-2 transition ${tab === "products" ? "border-brand-600 text-brand-900" : "border-transparent text-brand-500"}`}>
          📦 Products ({data.productsMissing})
        </button>
        <button onClick={() => setTab("variants")} className={`pb-2 px-1 text-sm font-medium border-b-2 transition ${tab === "variants" ? "border-brand-600 text-brand-900" : "border-transparent text-brand-500"}`}>
          🎨 Variants ({data.variantsMissing})
        </button>
        <button onClick={load} className="ml-auto text-xs text-brand-600 underline self-center">↻ Refresh</button>
      </div>

      {tab === "products" && (
        <div className="card overflow-hidden">
          {data.missingProducts.length === 0 ? (
            <div className="p-6 text-center text-green-700">🎉 No missing product images.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-brand-50">
                <tr className="text-left">
                  <th className="p-2">Product</th>
                  <th className="p-2">Category</th>
                  <th className="p-2">Broken URL</th>
                  <th className="p-2 text-right">Re-upload</th>
                </tr>
              </thead>
              <tbody>
                {data.missingProducts.map(p => (
                  <tr key={p.id} className="border-t border-brand-100">
                    <td className="p-2"><Link href={`/admin/products/${p.id}/edit`} className="text-brand-700 underline">{p.name}</Link></td>
                    <td className="p-2 text-brand-600">{p.category || "—"}</td>
                    <td className="p-2 font-mono text-xs text-brand-500 truncate max-w-xs">{p.imageUrl}</td>
                    <td className="p-2 text-right">
                      <label className={`inline-block px-3 py-1 rounded text-xs cursor-pointer font-medium transition ${uploading === `p-${p.id}` ? "bg-brand-100 text-brand-500" : "bg-brand-600 text-white hover:bg-brand-700"}`}>
                        {uploading === `p-${p.id}` ? "Uploading…" : "Choose file"}
                        <input type="file" accept="image/*" className="hidden"
                          disabled={uploading === `p-${p.id}`}
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadForProduct(p.id, f); }} />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "variants" && (
        <div className="card overflow-hidden">
          {data.missingVariants.length === 0 ? (
            <div className="p-6 text-center text-green-700">🎉 No missing variant images.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-brand-50">
                <tr className="text-left">
                  <th className="p-2">Product</th>
                  <th className="p-2">Variant</th>
                  <th className="p-2">Broken URL</th>
                  <th className="p-2 text-right">Re-upload</th>
                </tr>
              </thead>
              <tbody>
                {data.missingVariants.map(v => (
                  <tr key={v.id} className="border-t border-brand-100">
                    <td className="p-2"><Link href={`/admin/products/${v.productId}/edit`} className="text-brand-700 underline">{v.productName}</Link></td>
                    <td className="p-2">{v.name}</td>
                    <td className="p-2 font-mono text-xs text-brand-500 truncate max-w-xs">{v.imageUrl}</td>
                    <td className="p-2 text-right">
                      <label className={`inline-block px-3 py-1 rounded text-xs cursor-pointer font-medium transition ${uploading === `v-${v.id}` ? "bg-brand-100 text-brand-500" : "bg-brand-600 text-white hover:bg-brand-700"}`}>
                        {uploading === `v-${v.id}` ? "Uploading…" : "Choose file"}
                        <input type="file" accept="image/*" className="hidden"
                          disabled={uploading === `v-${v.id}`}
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadForVariant(v.id, f); }} />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
