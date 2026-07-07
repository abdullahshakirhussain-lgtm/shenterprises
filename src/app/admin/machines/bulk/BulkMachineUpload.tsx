"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  file: File;
  previewUrl: string;   // local object URL for preview
  uploadedUrl?: string; // storage URL once uploaded
  status: "pending" | "reading" | "ready" | "error" | "created";
  error?: string;
  modelNumber: string;
  name: string;
  brand: string;
  include: boolean;
};

let counter = 0;
const uid = () => `r${++counter}-${Date.now()}`;

export default function BulkMachineUpload() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function uploadOne(file: File): Promise<string> {
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "Upload failed");
    return j.url as string;
  }

  // Add files, then upload + AI-extract each (2 at a time to be gentle)
  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0) return;

    const newRows: Row[] = files.map(f => ({
      id: uid(), file: f, previewUrl: URL.createObjectURL(f),
      status: "pending", modelNumber: "", name: "", brand: "Prime", include: true,
    }));
    setRows(prev => [...prev, ...newRows]);

    // Process in small batches
    for (let i = 0; i < newRows.length; i += 2) {
      const batch = newRows.slice(i, i + 2);
      await Promise.all(batch.map(processRow));
    }
  }

  async function processRow(row: Row) {
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: "reading" } : r));
    try {
      const url = await uploadOne(row.file);
      const res = await fetch("/api/admin/machines/extract", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url.startsWith("/") ? window.location.origin + url : url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Read failed");
      setRows(prev => prev.map(r => r.id === row.id ? {
        ...r, status: "ready", uploadedUrl: url,
        modelNumber: data.modelNumber || "", name: data.name || "", brand: data.brand || "Prime",
      } : r));
    } catch (e: any) {
      // Even on AI failure, keep the uploaded image so the admin can type the fields
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: "error", error: e.message } : r));
    }
  }

  function update(id: string, field: "modelNumber" | "name" | "brand", val: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  }
  function toggle(id: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, include: !r.include } : r));
  }
  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id));
  }

  // If an upload happened during a failed extract, we still may not have uploadedUrl.
  // Re-upload lazily at create time when missing.
  async function ensureUploaded(row: Row): Promise<string> {
    if (row.uploadedUrl) return row.uploadedUrl;
    return uploadOne(row.file);
  }

  async function createAll() {
    const toCreate = rows.filter(r => r.include && r.name.trim() && r.modelNumber.trim());
    if (toCreate.length === 0) { setMsg("Nothing to create — each machine needs a name and model number."); return; }
    if (!confirm(`Create ${toCreate.length} machine listing(s)? They'll be published live (add price/specs later by editing).`)) return;

    setBusy(true); setMsg("");
    let ok = 0, failed = 0;
    for (const row of toCreate) {
      try {
        const imageUrl = await ensureUploaded(row);
        const res = await fetch("/api/admin/machines", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelNumber: row.modelNumber.trim(),
            name: row.name.trim(),
            brand: row.brand.trim() || "Prime",
            imageUrl,
            active: true,
          }),
        });
        if (!res.ok) throw new Error();
        ok++;
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: "created" } : r));
      } catch { failed++; }
    }
    setBusy(false);
    setMsg(`✓ Created ${ok} machine${ok === 1 ? "" : "s"}${failed ? ` · ${failed} failed` : ""}.`);
    if (ok > 0) { router.refresh(); }
  }

  const readyCount = rows.filter(r => r.include && r.name.trim() && r.modelNumber.trim() && r.status !== "created").length;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <p className="text-sm text-brand-700 mb-3">
          Upload a batch of machine photos where the <strong>model number &amp; name are printed in the image</strong>.
          AI reads each one and fills the fields — review, tweak if needed, then create all at once.
        </p>
        <label className="btn-primary cursor-pointer inline-block">
          Choose machine photos
          <input type="file" accept="image/*" multiple onChange={onFiles} className="hidden" />
        </label>
      </div>

      {rows.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Review ({rows.length})</h2>
            <button onClick={createAll} disabled={busy || readyCount === 0} className="btn-primary text-sm disabled:opacity-50">
              {busy ? "Creating…" : `Create ${readyCount} machine${readyCount === 1 ? "" : "s"}`}
            </button>
          </div>

          {msg && <div className={`mb-3 p-2 rounded text-sm ${msg.startsWith("✓") ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>{msg}</div>}

          <div className="space-y-3">
            {rows.map(r => (
              <div key={r.id} className={`flex gap-3 items-start p-3 rounded-lg border ${r.status === "created" ? "border-green-200 bg-green-50/40" : "border-brand-200"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.previewUrl} alt="" className="w-20 h-20 object-cover rounded shrink-0 border border-brand-100" />
                <div className="flex-1 min-w-0">
                  {r.status === "reading" && <p className="text-xs text-brand-500 animate-pulse mb-1">🔍 Reading image…</p>}
                  {r.status === "error" && <p className="text-xs text-amber-700 mb-1">Couldn&apos;t read — type the details manually.</p>}
                  {r.status === "created" && <p className="text-xs text-green-700 mb-1 font-semibold">✓ Created</p>}
                  <div className="grid sm:grid-cols-3 gap-2">
                    <input className="input text-sm py-1.5" placeholder="Model number" value={r.modelNumber}
                      onChange={e => update(r.id, "modelNumber", e.target.value)} disabled={r.status === "created"} />
                    <input className="input text-sm py-1.5 sm:col-span-2" placeholder="Name / type" value={r.name}
                      onChange={e => update(r.id, "name", e.target.value)} disabled={r.status === "created"} />
                    <input className="input text-sm py-1.5" placeholder="Brand" value={r.brand}
                      onChange={e => update(r.id, "brand", e.target.value)} disabled={r.status === "created"} />
                  </div>
                </div>
                {r.status !== "created" && (
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <label className="flex items-center gap-1 text-xs text-brand-600">
                      <input type="checkbox" checked={r.include} onChange={() => toggle(r.id)} /> Include
                    </label>
                    <button onClick={() => removeRow(r.id)} className="text-red-500 hover:text-red-700 text-sm">✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-brand-500 mt-3">
            Machines are created with just the photo, name, brand &amp; model number. Add price, specs, gallery and warranty later by editing each one.
          </p>
        </div>
      )}
    </div>
  );
}
