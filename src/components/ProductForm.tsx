"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ImageEditorModal from "./ImageEditorModal";

type Category = { id: number; name: string };
type Product = {
  id?: number; name: string; slug?: string; description?: string | null;
  price: number; salePrice?: number | null; sku?: string | null; stock: number;
  unitQty?: number | null; unitType?: string | null;
  imageUrl?: string | null; categoryId?: number | null;
  onOffer: boolean; featured: boolean; active: boolean;
  metaTitle?: string | null; metaDesc?: string | null;
};

const UNIT_TYPES = [
  { value: "", label: "— None —" },
  { value: "pieces", label: "pieces" },
  { value: "yards", label: "yards" },
  { value: "meters", label: "meters" },
  { value: "feet", label: "feet" },
  { value: "cm", label: "cm" },
];

export default function ProductForm({ initial, categories }: { initial?: Partial<Product>; categories: Category[] }) {
  const router = useRouter();
  const [p, setP] = useState<Product>({
    name: "", price: 0, stock: 0, onOffer: false, featured: false, active: true,
    unitQty: null, unitType: null,
    ...(initial as any)
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorImage, setEditorImage] = useState<string>("");
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [genBusy, setGenBusy] = useState<"" | "desc" | "seo">("");

  async function generateAI(action: "description" | "seo") {
    setGenBusy(action === "description" ? "desc" : "seo");
    setError("");
    try {
      // Make sure an image is uploaded first so AI can use it
      let imageUrl = p.imageUrl || null;
      if (imageFile) {
        const fd = new FormData(); fd.append("file", imageFile);
        const up = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const j = await up.json();
        if (!up.ok) throw new Error(j.error || "Image upload failed");
        imageUrl = j.url;
        setImageFile(null);
        setP(prev => ({ ...prev, imageUrl: imageUrl as string }));
      }

      const catName = categories.find(c => c.id === p.categoryId)?.name;
      const res = await fetch("/api/admin/ai/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          productId: p.id,
          name: p.name,
          description: p.description,
          categoryName: catName,
          unitQty: p.unitQty,
          unitType: p.unitType,
          imageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (action === "description") {
        setP(prev => ({ ...prev, description: data.description }));
      } else {
        setP(prev => ({ ...prev, metaTitle: data.metaTitle, metaDesc: data.metaDesc }));
      }
    } catch (e: any) {
      setError("AI generation failed: " + e.message);
    } finally {
      setGenBusy("");
    }
  }

  async function openEditor() {
    if (imageFile) {
      const fd = new FormData(); fd.append("file", imageFile);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) { setError(j.error || "Upload failed"); return; }
      up("imageUrl", j.url);
      setImageFile(null);
      setEditorImage(j.url);
    } else if (p.imageUrl) {
      setEditorImage(p.imageUrl);
    } else {
      setError("Please upload an image first."); return;
    }
    setEditorOpen(true);
  }

  function onEditorSave(newUrl: string) {
    up("imageUrl", newUrl);
    setEditorOpen(false);
  }

  function up<K extends keyof Product>(k: K, v: Product[K]) { setP({ ...p, [k]: v }); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSavedMsg("");
    try {
      let imageUrl = p.imageUrl || null;
      if (imageFile) {
        const fd = new FormData(); fd.append("file", imageFile);
        const up = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const j = await up.json();
        if (!up.ok) throw new Error(j.error || "Image upload failed");
        imageUrl = j.url;
      }
      const payload = { ...p, imageUrl };
      const url = p.id ? `/api/admin/products/${p.id}` : "/api/admin/products";
      const res = await fetch(url, { method: p.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      // EDIT: stay on edit page so VariantsPanel sees updated image
      // NEW: go to the edit page of the new product
      if (p.id) {
        setP({ ...p, imageUrl });
        setImageFile(null);
        setSavedMsg("✓ Saved");
        setTimeout(() => setSavedMsg(""), 2000);
        router.refresh();
      } else {
        router.push(`/admin/products/${data.id}/edit`);
        router.refresh();
      }
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} className="card p-5 max-w-3xl space-y-4">
      <div><label className="label">Name *</label><input required className="input" value={p.name} onChange={(e) => up("name", e.target.value)} /></div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div><label className="label">Price (LKR) *</label><input required type="number" min="0" step="0.01" className="input" value={p.price} onChange={(e) => up("price", parseFloat(e.target.value) || 0)} /></div>
        <div><label className="label">Sale price</label><input type="number" min="0" step="0.01" className="input" value={p.salePrice ?? ""} onChange={(e) => up("salePrice", e.target.value === "" ? null : parseFloat(e.target.value))} /></div>
        <div><label className="label">Stock</label><input type="number" min="0" className="input" value={p.stock} onChange={(e) => up("stock", parseInt(e.target.value) || 0)} /></div>
      </div>

      {/* Unit qty + type — shown next to product name on storefront */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Unit quantity</label>
          <input type="number" min="0" className="input" placeholder="e.g. 100" value={p.unitQty ?? ""}
            onChange={(e) => up("unitQty", e.target.value === "" ? null : parseInt(e.target.value))} />
        </div>
        <div>
          <label className="label">Unit type</label>
          <select className="input" value={p.unitType ?? ""}
            onChange={(e) => up("unitType", e.target.value || null)}>
            {UNIT_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
        <div className="text-xs text-brand-500 pt-7">
          Shown next to the product name (e.g. <em>Polyester Thread — 100 pieces</em>). Leave empty if not applicable.
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="label">SKU</label><input className="input" value={p.sku ?? ""} onChange={(e) => up("sku", e.target.value)} /></div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={p.categoryId ?? ""} onChange={(e) => up("categoryId", e.target.value ? parseInt(e.target.value) : null)}>
            <option value="">— None —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Description</label>
          <button type="button" onClick={() => generateAI("description")} disabled={genBusy !== "" || !p.name}
            className="text-xs px-2 py-1 rounded bg-brand-100 text-brand-700 hover:bg-brand-200 disabled:opacity-50">
            {genBusy === "desc" ? "Generating…" : "✨ Generate with AI"}
          </button>
        </div>
        <textarea rows={4} className="input" value={p.description ?? ""} onChange={(e) => up("description", e.target.value)}
          placeholder={genBusy === "desc" ? "GPT-4o is writing a description…" : "Describe the product, or click ✨ Generate with AI"} />
        <p className="text-xs text-brand-500 mt-1">AI uses the product name, category, variants, and image to draft a description you can edit before saving.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Product image</label>
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="input" />
          {(p.imageUrl || imageFile) && (
            <div className="mt-2 flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageFile ? URL.createObjectURL(imageFile) : (p.imageUrl as string)} alt="" className="w-24 h-24 object-cover rounded border border-brand-200" />
              <div className="space-y-1">
                <button type="button" onClick={openEditor} className="btn-secondary text-xs">
                  ✂️✨ Edit image (crop / remove BG)
                </button>
                <p className="text-xs text-brand-500">Optional — crop the image and/or remove background using AI</p>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-2 pt-6">
          <label className="flex items-center gap-2"><input type="checkbox" checked={p.active} onChange={(e) => up("active", e.target.checked)} /> Active (visible)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={p.onOffer} onChange={(e) => up("onOffer", e.target.checked)} /> On offer</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={p.featured} onChange={(e) => up("featured", e.target.checked)} /> Featured on home</label>
        </div>
      </div>

      <details className="border border-brand-100 rounded p-3">
        <summary className="font-medium cursor-pointer">SEO (optional)</summary>
        <div className="mt-3 space-y-3">
          <button type="button" onClick={() => generateAI("seo")} disabled={genBusy !== "" || !p.name}
            className="text-xs px-2 py-1 rounded bg-brand-100 text-brand-700 hover:bg-brand-200 disabled:opacity-50">
            {genBusy === "seo" ? "Generating…" : "✨ Generate meta title + description with AI"}
          </button>
          <div>
            <label className="label">Meta title <span className="text-xs text-brand-500">({(p.metaTitle || "").length}/60)</span></label>
            <input className="input" maxLength={60} value={p.metaTitle ?? ""} onChange={(e) => up("metaTitle", e.target.value)} />
          </div>
          <div>
            <label className="label">Meta description <span className="text-xs text-brand-500">({(p.metaDesc || "").length}/155)</span></label>
            <textarea rows={2} maxLength={155} className="input" value={p.metaDesc ?? ""} onChange={(e) => up("metaDesc", e.target.value)} />
          </div>
        </div>
      </details>

      {error && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{error}</div>}
      {savedMsg && <div className="text-sm text-green-700 bg-green-50 p-2 rounded">{savedMsg}</div>}

      <div className="flex gap-2">
        <button disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save product"}</button>
        <button type="button" onClick={() => router.push("/admin/products")} className="btn-secondary">Back to products</button>
      </div>

      {editorOpen && (
        <ImageEditorModal
          imageUrl={editorImage}
          onClose={() => setEditorOpen(false)}
          onSave={onEditorSave}
        />
      )}
    </form>
  );
}
