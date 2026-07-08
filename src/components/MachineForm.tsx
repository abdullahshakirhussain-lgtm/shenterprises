"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SpecRow = { key: string; value: string };
type EquivRow = { brand: string; model: string; note?: string };
type FaqRow = { q: string; a: string };
type Machine = {
  id?: number;
  modelNumber: string;
  brand: string;
  name: string;
  category?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  images?: string | string[] | null;
  description?: string | null;
  specs?: string | SpecRow[] | null;
  warrantyInfo?: string | null;
  equivalents?: string | EquivRow[] | null;
  faq?: string | FaqRow[] | null;
  seoIntro?: string | null;
  active: boolean;
};

function parseImages(v: string | string[] | null | undefined): string[] {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (!v) return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p.filter(Boolean) : []; } catch { return []; }
}
function parseSpecs(v: string | SpecRow[] | null | undefined): SpecRow[] {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
}
function parseJsonArray<T>(v: string | T[] | null | undefined): T[] {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
}

export default function MachineForm({ initial }: { initial?: Partial<Machine> }) {
  const router = useRouter();
  const [m, setM] = useState<Machine>({
    modelNumber: "", brand: "Prime", name: "", active: true,
    ...(initial as any),
  });
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [gallery, setGallery] = useState<string[]>(parseImages(initial?.images));
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [specs, setSpecs] = useState<SpecRow[]>(parseSpecs(initial?.specs));
  const [equivalents, setEquivalents] = useState<EquivRow[]>(parseJsonArray<EquivRow>(initial?.equivalents));
  const [faq, setFaq] = useState<FaqRow[]>(parseJsonArray<FaqRow>(initial?.faq));
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [saving, setSaving] = useState(false);

  function up<K extends keyof Machine>(k: K, v: Machine[K]) { setM({ ...m, [k]: v }); }

  async function uploadOne(file: File): Promise<string> {
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "Image upload failed");
    return j.url as string;
  }

  // Spec editor
  function addSpec() { setSpecs(s => [...s, { key: "", value: "" }]); }
  function updateSpec(i: number, field: "key" | "value", val: string) {
    setSpecs(s => s.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }
  function removeSpec(i: number) { setSpecs(s => s.filter((_, idx) => idx !== i)); }

  // Equivalents editor
  function addEquiv() { setEquivalents(e => [...e, { brand: "", model: "", note: "" }]); }
  function updateEquiv(i: number, field: keyof EquivRow, val: string) {
    setEquivalents(e => e.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }
  function removeEquiv(i: number) { setEquivalents(e => e.filter((_, idx) => idx !== i)); }

  async function suggestEquivalents() {
    if (!m.modelNumber && !m.name) { setError("Add a model number or name first, then suggest."); return; }
    setSuggesting(true); setError("");
    try {
      const res = await fetch("/api/admin/machines/suggest-equivalents", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: m.brand, modelNumber: m.modelNumber, name: m.name, category: m.category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Suggestion failed");
      // Merge suggestions, skipping ones already present (by brand+model)
      const have = new Set(equivalents.map(e => `${e.brand}|${e.model}`.toLowerCase()));
      const added = (data.equivalents || []).filter((e: EquivRow) => !have.has(`${e.brand}|${e.model}`.toLowerCase()));
      setEquivalents(prev => [...prev, ...added]);
      if (added.length === 0) setError("No new equivalents suggested — you may already have them, or the AI wasn't confident.");
    } catch (e: any) { setError(e.message); } finally { setSuggesting(false); }
  }

  // FAQ editor
  function addFaq() { setFaq(f => [...f, { q: "", a: "" }]); }
  function updateFaq(i: number, field: "q" | "a", val: string) {
    setFaq(f => f.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }
  function removeFaq(i: number) { setFaq(f => f.filter((_, idx) => idx !== i)); }

  // Gallery
  function onGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setGalleryFiles(prev => [...prev, ...list]);
    e.target.value = "";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSavedMsg("");
    try {
      let imageUrl = m.imageUrl || null;
      if (mainFile) imageUrl = await uploadOne(mainFile);

      const newGallery: string[] = [];
      for (const f of galleryFiles) newGallery.push(await uploadOne(f));
      const allGallery = [...gallery, ...newGallery];

      const payload = {
        ...m,
        imageUrl,
        images: JSON.stringify(allGallery),
        specs: specs.filter(r => r.key || r.value),
        equivalents: equivalents.filter(r => r.brand || r.model),
        faq: faq.filter(r => r.q || r.a),
      };
      const url = m.id ? `/api/admin/machines/${m.id}` : "/api/admin/machines";
      const res = await fetch(url, { method: m.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      if (m.id) {
        setM({ ...m, imageUrl });
        setMainFile(null); setGallery(allGallery); setGalleryFiles([]);
        setSavedMsg("✓ Saved"); setTimeout(() => setSavedMsg(""), 2000);
        router.refresh();
      } else {
        router.push(`/admin/machines/${data.id}/edit`);
        router.refresh();
      }
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} className="card p-5 max-w-3xl space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="label">Model number *</label><input required className="input" placeholder="e.g. JK-8720" value={m.modelNumber} onChange={e => up("modelNumber", e.target.value)} /></div>
        <div><label className="label">Brand</label><input className="input" value={m.brand} onChange={e => up("brand", e.target.value)} /></div>
      </div>

      <div><label className="label">Name *</label><input required className="input" placeholder="e.g. Single Needle Direct Drive Lockstitch" value={m.name} onChange={e => up("name", e.target.value)} /></div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="label">Category</label><input className="input" placeholder="e.g. Single Needle Lockstitch" value={m.category ?? ""} onChange={e => up("category", e.target.value)} /></div>
        <div>
          <label className="label">Price (LKR) <span className="text-brand-500 text-xs">— leave empty for “Enquire for price”</span></label>
          <input type="number" min="0" step="0.01" className="input" value={m.price ?? ""} onChange={e => up("price", e.target.value === "" ? null : parseFloat(e.target.value))} />
        </div>
      </div>

      <div>
        <label className="label">Description</label>
        <textarea rows={4} className="input" value={m.description ?? ""} onChange={e => up("description", e.target.value)} />
      </div>

      {/* Spec table editor */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Specifications</label>
          <button type="button" onClick={addSpec} className="text-xs px-2 py-1 rounded bg-brand-100 text-brand-700 hover:bg-brand-200">+ Add spec</button>
        </div>
        {specs.length === 0 ? (
          <p className="text-xs italic text-brand-400">No specs yet. Add rows like “Max speed → 5000 spm”, “Motor → Servo”, “Included → Table + stand”.</p>
        ) : (
          <div className="space-y-2">
            {specs.map((r, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input className="input flex-1" placeholder="Spec name (e.g. Max speed)" value={r.key} onChange={e => updateSpec(i, "key", e.target.value)} />
                <input className="input flex-1" placeholder="Value (e.g. 5000 spm)" value={r.value} onChange={e => updateSpec(i, "value", e.target.value)} />
                <button type="button" onClick={() => removeSpec(i)} className="text-red-500 hover:text-red-700 px-2">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="label">Warranty / trust info</label>
        <textarea rows={2} className="input" placeholder="e.g. 1-year warranty. Authorized Prime dealer. Island-wide after-sales service." value={m.warrantyInfo ?? ""} onChange={e => up("warrantyInfo", e.target.value)} />
      </div>

      {/* Cross-brand equivalents — SEO engine */}
      <div className="border border-brand-200 rounded-lg p-4 bg-brand-50/40">
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Equivalent models (other brands)</label>
          <button type="button" onClick={suggestEquivalents} disabled={suggesting}
            className="text-xs px-2 py-1 rounded bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50">
            {suggesting ? "Thinking…" : "✨ Suggest with AI"}
          </button>
        </div>
        <p className="text-xs text-brand-600 mb-3">
          Same machine sold under other brands. These help buyers searching a competitor&apos;s model number find this listing.
          AI only <strong>suggests</strong> — keep only the ones you know are accurate.
        </p>
        {equivalents.length === 0 ? (
          <p className="text-xs italic text-brand-400">None yet. Add rows like “Juki → DDL-8700”, or click Suggest with AI.</p>
        ) : (
          <div className="space-y-2">
            {equivalents.map((r, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input className="input flex-1 text-sm py-1.5" placeholder="Brand (e.g. Juki)" value={r.brand} onChange={e => updateEquiv(i, "brand", e.target.value)} />
                <input className="input flex-1 text-sm py-1.5" placeholder="Model (e.g. DDL-8700)" value={r.model} onChange={e => updateEquiv(i, "model", e.target.value)} />
                <input className="input flex-1 text-sm py-1.5" placeholder="Note (optional)" value={r.note ?? ""} onChange={e => updateEquiv(i, "note", e.target.value)} />
                <button type="button" onClick={() => removeEquiv(i)} className="text-red-500 hover:text-red-700 px-2">✕</button>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={addEquiv} className="mt-2 text-xs px-2 py-1 rounded bg-brand-100 text-brand-700 hover:bg-brand-200">+ Add equivalent</button>
      </div>

      {/* FAQ — powers FAQPage rich snippets */}
      <div className="border border-brand-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">FAQ (shows on page + Google rich snippets)</label>
          <button type="button" onClick={addFaq} className="text-xs px-2 py-1 rounded bg-brand-100 text-brand-700 hover:bg-brand-200">+ Add question</button>
        </div>
        <p className="text-xs text-brand-600 mb-3">Great for capturing search queries, e.g. “Is the Prime {m.modelNumber || "X"} the same as the Juki DDL-8700?”.</p>
        {faq.length === 0 ? (
          <p className="text-xs italic text-brand-400">No FAQs yet.</p>
        ) : (
          <div className="space-y-3">
            {faq.map((r, i) => (
              <div key={i} className="space-y-1">
                <div className="flex gap-2 items-center">
                  <input className="input flex-1 text-sm py-1.5" placeholder="Question" value={r.q} onChange={e => updateFaq(i, "q", e.target.value)} />
                  <button type="button" onClick={() => removeFaq(i)} className="text-red-500 hover:text-red-700 px-2">✕</button>
                </div>
                <textarea rows={2} className="input text-sm" placeholder="Answer" value={r.a} onChange={e => updateFaq(i, "a", e.target.value)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="label">SEO intro paragraph <span className="text-brand-500 text-xs">(optional — keyword-rich lead shown at the top of the page)</span></label>
        <textarea rows={3} className="input" placeholder="e.g. The Prime JK-8720 is a high-speed single-needle lockstitch industrial sewing machine — the direct equivalent of the Juki DDL-8700 — available in Sri Lanka with warranty and island-wide service." value={m.seoIntro ?? ""} onChange={e => up("seoIntro", e.target.value)} />
      </div>

      {/* Main image */}
      <div>
        <label className="label">Main image</label>
        <input type="file" accept="image/*" onChange={e => setMainFile(e.target.files?.[0] || null)} className="input" />
        {(m.imageUrl || mainFile) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mainFile ? URL.createObjectURL(mainFile) : (m.imageUrl as string)} alt="" className="mt-2 w-28 h-28 object-cover rounded border border-brand-200" />
        )}
      </div>

      {/* Gallery */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Gallery images</label>
          <label className="text-xs px-2 py-1 rounded bg-brand-100 text-brand-700 hover:bg-brand-200 cursor-pointer">
            + Add images<input type="file" accept="image/*" multiple onChange={onGalleryChange} className="hidden" />
          </label>
        </div>
        {(gallery.length > 0 || galleryFiles.length > 0) ? (
          <div className="flex flex-wrap gap-2">
            {gallery.map((url, i) => (
              <div key={`g-${i}`} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-20 h-20 object-cover rounded border border-brand-200" />
                <button type="button" onClick={() => setGallery(g => g.filter((_, idx) => idx !== i))}
                  className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100">✕</button>
              </div>
            ))}
            {galleryFiles.map((f, i) => (
              <div key={`gf-${i}`} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(f)} alt="" className="w-20 h-20 object-cover rounded border-2 border-dashed border-yellow-400" />
                <button type="button" onClick={() => setGalleryFiles(g => g.filter((_, idx) => idx !== i))}
                  className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100">✕</button>
              </div>
            ))}
          </div>
        ) : <p className="text-xs italic text-brand-400">No gallery images yet.</p>}
      </div>

      <label className="flex items-center gap-2"><input type="checkbox" checked={m.active} onChange={e => up("active", e.target.checked)} /> Active (visible on the site)</label>

      {error && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{error}</div>}
      {savedMsg && <div className="text-sm text-green-700 bg-green-50 p-2 rounded">{savedMsg}</div>}

      <div className="flex gap-2">
        <button disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save machine"}</button>
        <button type="button" onClick={() => router.push("/admin/machines")} className="btn-secondary">Back to machines</button>
      </div>
    </form>
  );
}
