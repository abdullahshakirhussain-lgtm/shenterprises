"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Faq = { q: string; a: string };
type T = {
  id: number; name: string; slug: string; blurb: string | null; seoIntro: string | null;
  faq: string | null; sortOrder: number; machineCount: number;
};

function parseFaq(v: string | null): Faq[] {
  if (!v) return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
}

/** CRUD manager for machine types: list, inline edit, add. */
export default function MachineTypesManager({ initialTypes }: { initialTypes: T[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<number | "new" | null>(null);

  return (
    <div className="space-y-3">
      {initialTypes.map(t => (
        <div key={t.id} className="card">
          <button type="button" onClick={() => setOpenId(openId === t.id ? null : t.id)}
            className="w-full flex items-center justify-between gap-3 p-4 text-left">
            <span>
              <span className="font-semibold text-brand-900">{t.name}</span>
              <span className="text-xs text-brand-500 ml-2">/machines/{t.slug} · {t.machineCount} machine{t.machineCount === 1 ? "" : "s"}</span>
            </span>
            <span className="flex items-center gap-3 shrink-0">
              <Link href={`/machines/${t.slug}`} target="_blank" onClick={e => e.stopPropagation()}
                className="text-xs text-brand-600 underline">View</Link>
              <span className="text-brand-400">{openId === t.id ? "▴" : "▾"}</span>
            </span>
          </button>
          {openId === t.id && <TypeForm existing={t} onDone={() => { setOpenId(null); router.refresh(); }} />}
        </div>
      ))}

      <div className="card">
        {openId === "new" ? (
          <TypeForm onDone={() => { setOpenId(null); router.refresh(); }} />
        ) : (
          <button type="button" onClick={() => setOpenId("new")} className="w-full p-4 text-left text-brand-700 font-semibold">
            + Add machine type
          </button>
        )}
      </div>
    </div>
  );
}

function TypeForm({ existing, onDone }: { existing?: T; onDone: () => void }) {
  const [name, setName] = useState(existing?.name || "");
  const [slug, setSlug] = useState(existing?.slug || "");
  const [blurb, setBlurb] = useState(existing?.blurb || "");
  const [seoIntro, setSeoIntro] = useState(existing?.seoIntro || "");
  const [sortOrder, setSortOrder] = useState(existing?.sortOrder ?? 0);
  const [faq, setFaq] = useState<Faq[]>(existing ? parseFaq(existing.faq) : []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setErr(""); setBusy(true);
    try {
      const payload = { name, slug, blurb, seoIntro, faq, sortOrder };
      const res = await fetch(existing ? `/api/admin/machine-types/${existing.id}` : "/api/admin/machine-types", {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Save failed");
      onDone();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function del() {
    if (!existing) return;
    if (!confirm(`Delete type "${existing.name}"? The hub page disappears; machines keep their category text.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/machine-types/${existing.id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || "Delete failed"); }
      onDone();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="p-4 border-t border-brand-100 space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <div><label className="label">Name</label>
          <input className="input" placeholder="Embroidery Machines" value={name} onChange={e => setName(e.target.value)} /></div>
        <div><label className="label">Slug <span className="text-brand-500 text-xs">— blank = auto</span></label>
          <input className="input" placeholder="embroidery-machines" value={slug} onChange={e => setSlug(e.target.value)} /></div>
        <div><label className="label">Sort order</label>
          <input type="number" className="input" value={sortOrder} onChange={e => setSortOrder(parseInt(e.target.value) || 0)} /></div>
      </div>
      <div><label className="label">Card blurb <span className="text-brand-500 text-xs">— one line on the browse card</span></label>
        <input className="input" placeholder="Single & multi-head computer embroidery, up to 12 needles." value={blurb} onChange={e => setBlurb(e.target.value)} /></div>
      <div><label className="label">SEO intro <span className="text-brand-500 text-xs">— hub lead paragraph; include &quot;price Sri Lanka&quot; + competitor brands at class level</span></label>
        <textarea className="input" rows={3} value={seoIntro} onChange={e => setSeoIntro(e.target.value)} /></div>

      <div>
        <label className="label">FAQ</label>
        <div className="space-y-2">
          {faq.map((f, i) => (
            <div key={i} className="flex gap-2">
              <input className="input flex-1" placeholder="Question" value={f.q}
                onChange={e => setFaq(prev => prev.map((x, j) => j === i ? { ...x, q: e.target.value } : x))} />
              <input className="input flex-[2]" placeholder="Answer" value={f.a}
                onChange={e => setFaq(prev => prev.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} />
              <button type="button" onClick={() => setFaq(prev => prev.filter((_, j) => j !== i))}
                className="text-red-500 px-2" aria-label="Remove">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setFaq(prev => [...prev, { q: "", a: "" }])}
            className="text-sm text-brand-600 underline">+ Add FAQ row</button>
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2 justify-end">
        {existing && <button type="button" onClick={del} disabled={busy} className="px-3 py-2 rounded bg-red-100 text-red-700 text-sm hover:bg-red-200 disabled:opacity-50">Delete</button>}
        <button type="button" onClick={save} disabled={busy || !name.trim()} className="btn-primary disabled:opacity-50">
          {busy ? "Saving…" : existing ? "Save changes" : "Create type"}
        </button>
      </div>
    </div>
  );
}
