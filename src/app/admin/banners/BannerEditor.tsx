"use client";
import { useState } from "react";

type Banner = {
  id: number;
  imageUrl: string;
  headline: string | null;
  subtitle: string | null;
  buttonText: string | null;
  buttonHref: string | null;
  sortOrder: number;
  active: boolean;
};

export default function BannerEditor({ initial }: { initial: Banner[] }) {
  const [banners, setBanners] = useState<Banner[]>(initial);
  const [editing, setEditing] = useState<Partial<Banner> | null>(null);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function newBanner() {
    setEditing({ imageUrl: "", headline: "", subtitle: "", buttonText: "", buttonHref: "/shop", sortOrder: banners.length, active: true });
    setUploadingFile(null);
  }

  function edit(b: Banner) { setEditing(b); setUploadingFile(null); }
  function cancel() { setEditing(null); setUploadingFile(null); setMsg(""); }

  async function save() {
    if (!editing) return;
    setBusy(true); setMsg("");
    try {
      let imageUrl = editing.imageUrl || "";
      if (uploadingFile) {
        const fd = new FormData(); fd.append("file", uploadingFile);
        const up = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const j = await up.json();
        if (!up.ok) throw new Error(j.error || "Image upload failed");
        imageUrl = j.url;
      }
      if (!imageUrl) throw new Error("Please upload an image");

      const payload = { ...editing, imageUrl };
      const url = editing.id ? `/api/admin/banners/${editing.id}` : "/api/admin/banners";
      const res = await fetch(url, {
        method: editing.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setBanners(b => editing.id ? b.map(x => x.id === editing.id ? data : x) : [...b, data]);
      setEditing(null); setUploadingFile(null);
      setMsg("✓ Saved");
      setTimeout(() => setMsg(""), 2000);
    } catch (e: any) {
      setMsg("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this banner?")) return;
    await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    setBanners(b => b.filter(x => x.id !== id));
  }

  async function toggleActive(b: Banner) {
    const res = await fetch(`/api/admin/banners/${b.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...b, active: !b.active }),
    });
    const data = await res.json();
    setBanners(bs => bs.map(x => x.id === b.id ? data : x));
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {/* List */}
      <div className="space-y-3">
        {banners.length === 0 && !editing && (
          <div className="card p-6 text-center text-brand-600">No banners yet. Add your first one below.</div>
        )}
        {banners.map(b => (
          <div key={b.id} className="card p-3 flex gap-3 items-center">
            <img src={b.imageUrl} alt="" className="w-40 h-20 object-cover rounded border border-brand-100" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{b.headline || <span className="text-brand-400 italic">No headline</span>}</div>
              <div className="text-sm text-brand-600 truncate">{b.subtitle || "—"}</div>
              <div className="text-xs text-brand-500 mt-1">
                Button: {b.buttonText ? `"${b.buttonText}" → ${b.buttonHref || "(no link)"}` : "none"} · Order: {b.sortOrder}
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <button onClick={() => toggleActive(b)} className={`text-xs px-2 py-1 rounded ${b.active ? "bg-green-100 text-green-800" : "bg-brand-100 text-brand-600"}`}>
                {b.active ? "Active" : "Hidden"}
              </button>
              <div className="flex gap-1">
                <button onClick={() => edit(b)} className="text-xs px-3 py-1 rounded bg-brand-600 text-white">Edit</button>
                <button onClick={() => remove(b.id)} className="text-xs px-3 py-1 rounded bg-red-50 text-red-700 border border-red-200">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add new button */}
      {!editing && (
        <button onClick={newBanner} className="btn-primary">+ Add new banner</button>
      )}

      {/* Editor */}
      {editing && (
        <div className="card p-5 space-y-4 border-2 border-brand-300">
          <h3 className="font-semibold text-lg">{editing.id ? "Edit banner" : "New banner"}</h3>

          <div>
            <label className="label">Banner image *</label>
            <input type="file" accept="image/*" onChange={e => setUploadingFile(e.target.files?.[0] || null)} className="input" />
            {(editing.imageUrl || uploadingFile) && (
              <div className="mt-2">
                <img src={uploadingFile ? URL.createObjectURL(uploadingFile) : editing.imageUrl!} alt="" className="max-h-40 rounded border border-brand-200" />
              </div>
            )}
            <p className="text-xs text-brand-500 mt-1">Recommended: 1920×800px (3:1 ratio). Shown full-bleed.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Headline</label>
              <input className="input" value={editing.headline || ""} onChange={e => setEditing({ ...editing, headline: e.target.value })} placeholder="e.g. New Spring Collection" />
            </div>
            <div>
              <label className="label">Subtitle</label>
              <input className="input" value={editing.subtitle || ""} onChange={e => setEditing({ ...editing, subtitle: e.target.value })} placeholder="e.g. Fresh threads & ribbons for your projects" />
            </div>
            <div>
              <label className="label">Button text</label>
              <input className="input" value={editing.buttonText || ""} onChange={e => setEditing({ ...editing, buttonText: e.target.value })} placeholder="e.g. Shop the collection" />
            </div>
            <div>
              <label className="label">Button link</label>
              <input className="input" value={editing.buttonHref || ""} onChange={e => setEditing({ ...editing, buttonHref: e.target.value })} placeholder="e.g. /category/threads or /offers" />
            </div>
            <div>
              <label className="label">Sort order</label>
              <input type="number" className="input" value={editing.sortOrder ?? 0} onChange={e => setEditing({ ...editing, sortOrder: parseInt(e.target.value) || 0 })} />
              <p className="text-xs text-brand-500 mt-1">Lower numbers appear first in the rotation.</p>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="banner-active" checked={editing.active ?? true} onChange={e => setEditing({ ...editing, active: e.target.checked })} />
              <label htmlFor="banner-active" className="text-sm">Active (show on home page)</label>
            </div>
          </div>

          {msg && <div className={`text-sm p-2 rounded ${msg.startsWith("✓") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{msg}</div>}

          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="btn-primary">{busy ? "Saving…" : "Save banner"}</button>
            <button onClick={cancel} disabled={busy} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
