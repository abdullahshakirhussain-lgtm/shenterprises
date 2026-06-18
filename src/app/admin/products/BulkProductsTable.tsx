"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatLKR } from "@/lib/utils";

type Product = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  salePrice: number | null;
  stock: number;
  active: boolean;
  onOffer: boolean;
  featured: boolean;
  imageUrl: string | null;
  category: { id: number; name: string; slug: string } | null;
  missing?: string[];
};

type Category = { id: number; name: string; slug: string };

type SuggestedGroup = {
  keeperId: number;
  keeperName: string;
  keeperOriginal: string;
  members: { id: number; name: string; suggestedVariants: { type: string; name: string }[] }[];
};

type MergeMember = {
  id: number;
  name: string;
  variants: { type: "color" | "size"; name: string }[];
};

export default function BulkProductsTable({ products, categories, currentCategorySlug }: { products: Product[]; categories: Category[]; currentCategorySlug?: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");
  const [bulkPayload, setBulkPayload] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Merge modal state
  const [mergeOpen, setMergeOpen] = useState(false);
  const [keeperId, setKeeperId] = useState<number | null>(null);
  const [mergeMembers, setMergeMembers] = useState<MergeMember[]>([]);

  // AI suggestions state
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedGroup[]>([]);
  const initialSuggestCategory = currentCategorySlug
    ? String(categories.find(c => c.slug === currentCategorySlug)?.id || "")
    : "";
  const [suggestCategory, setSuggestCategory] = useState<string>(initialSuggestCategory);

  const selectedProducts = useMemo(() => products.filter(p => selected.has(p.id)), [selected, products]);
  const allChecked = products.length > 0 && selected.size === products.length;

  function toggle(id: number) {
    setSelected(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(products.map(p => p.id)));
  }

  // Single-product duplicate
  async function duplicateProduct(id: number) {
    setBusy(true); setMsg("");
    try {
      const res = await fetch(`/api/admin/products/${id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Redirect to edit page of the new copy so user can immediately tweak it
      router.push(`/admin/products/${data.id}/edit`);
    } catch (e: any) {
      setMsg("Error: " + e.message);
      setBusy(false);
    }
  }

  // Single-product delete
  async function deleteProduct(id: number, name: string) {
    if (!confirm(`Delete "${name}"?\n\nThis cannot be undone. If the product has order history, it will be blocked — hide it instead.`)) return;
    setBusy(true); setMsg("");
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(`✓ Deleted "${name}"`);
      router.refresh();
    } catch (e: any) {
      setMsg("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function runBulk(action: string, payload: any = {}) {
    if (selected.size === 0) return;
    if (action === "delete" && !confirm(`Delete ${selected.size} product(s)?\n\nNote: products with existing orders cannot be deleted and will be skipped.`)) return;

    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, productIds: Array.from(selected), payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (action === "delete") {
        let text = `✓ Deleted ${data.deleted} product(s)`;
        if (data.skipped?.length) text += ` — skipped ${data.skipped.length} with orders`;
        setMsg(text);
      } else {
        setMsg(`✓ Updated ${selected.size} product(s)`);
      }
      setSelected(new Set());
      setBulkAction("");
      setBulkPayload({});
      router.refresh();
    } catch (e: any) {
      setMsg("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // Manual merge — open modal with selected products
  function openMergeModal() {
    if (selected.size < 2) {
      setMsg("Select at least 2 products to merge");
      return;
    }
    const sel = Array.from(selected);
    setKeeperId(sel[0]);
    setMergeMembers(
      sel.slice(1).map(id => ({
        id,
        name: products.find(p => p.id === id)?.name || "",
        variants: [{ type: "color", name: "" }],
      }))
    );
    setMergeOpen(true);
  }

  function updateMemberVariant(memberId: number, i: number, key: "type" | "name", val: string) {
    setMergeMembers(ms => ms.map(m => m.id === memberId
      ? { ...m, variants: m.variants.map((v, idx) => idx === i ? { ...v, [key]: val } : v) }
      : m
    ));
  }

  function addMemberVariant(memberId: number) {
    setMergeMembers(ms => ms.map(m => m.id === memberId
      ? { ...m, variants: [...m.variants, { type: "color", name: "" }] }
      : m
    ));
  }

  function removeMemberVariant(memberId: number, i: number) {
    setMergeMembers(ms => ms.map(m => m.id === memberId
      ? { ...m, variants: m.variants.filter((_, idx) => idx !== i) }
      : m
    ));
  }

  // Swap keeper to a different selected product
  function changeKeeper(newKeeperId: number) {
    if (!keeperId || newKeeperId === keeperId) return;
    // Old keeper becomes a member (with empty variants), new keeper removed from members
    setMergeMembers(ms => {
      const withoutNew = ms.filter(m => m.id !== newKeeperId);
      const oldKeeperProduct = products.find(p => p.id === keeperId);
      return [...withoutNew, { id: keeperId!, name: oldKeeperProduct?.name || "", variants: [{ type: "color", name: "" }] }];
    });
    setKeeperId(newKeeperId);
  }

  async function executeMerge() {
    if (!keeperId) return;
    // Validate: each member needs at least one variant with a name
    const invalid = mergeMembers.find(m => !m.variants.some(v => v.name.trim()));
    if (invalid) {
      setMsg(`"${invalid.name}" needs at least one variant name`);
      return;
    }

    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/admin/products/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keeperId,
          members: mergeMembers.map(m => ({
            id: m.id,
            variants: m.variants.filter(v => v.name.trim()),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(`✓ Merged ${data.mergedCount} product(s) into the keeper (total stock: ${data.newStock})`);
      setMergeOpen(false);
      setSelected(new Set());
      router.refresh();
    } catch (e: any) {
      setMsg("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // AI suggestions
  async function fetchSuggestions() {
    setSuggesting(true); setMsg(""); setSuggestions([]);
    try {
      const body: any = {};
      if (suggestCategory) body.categoryId = parseInt(suggestCategory);
      else if (selected.size > 0) body.productIds = Array.from(selected);

      const res = await fetch("/api/admin/products/suggest-merges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuggestions(data.groups || []);
      if (!data.groups?.length) setMsg("AI didn't find any merge candidates in this set.");
    } catch (e: any) {
      setMsg("Error: " + e.message);
    } finally {
      setSuggesting(false);
    }
  }

  async function applySuggestion(group: SuggestedGroup) {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/admin/products/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keeperId: group.keeperId,
          members: group.members.map(m => ({
            id: m.id,
            variants: m.suggestedVariants.filter(v => v.name?.trim()),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(`✓ Merged "${group.keeperName}" — ${data.mergedCount} products combined`);
      // Remove from suggestions list
      setSuggestions(s => s.filter(g => g.keeperId !== group.keeperId));
      router.refresh();
    } catch (e: any) {
      setMsg("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* AI suggest panel — sticky when open */}
      <div className={`card p-4 ${suggestOpen ? "sticky top-14 z-20 shadow-lg max-h-[70vh] overflow-y-auto" : ""}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-semibold">🤖 AI-suggested merges</h2>
            <p className="text-xs text-brand-600">Let GPT-4o scan products and suggest which ones should be merged into a single product with variants.</p>
          </div>
          <button onClick={() => setSuggestOpen(v => !v)} className="btn-secondary text-sm">
            {suggestOpen ? "Hide" : "Open AI suggestions"}
          </button>
        </div>

        {suggestOpen && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="label text-xs">Scope</label>
                <select className="input" value={suggestCategory} onChange={e => setSuggestCategory(e.target.value)}>
                  <option value="">{selected.size > 0 ? `${selected.size} selected products` : "All active products"}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button onClick={fetchSuggestions} disabled={suggesting} className="btn-primary text-sm">
                {suggesting ? "🔍 Analyzing…" : "✨ Suggest merges"}
              </button>
            </div>

            {suggestions.length > 0 && (
              <div className="space-y-3">
                {suggestions.map(g => (
                  <div key={g.keeperId} className="border border-brand-200 rounded p-3 bg-brand-50/30">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-semibold text-brand-900">{g.keeperName}</div>
                        <div className="text-xs text-brand-600">Keeper: {g.keeperOriginal} (#{g.keeperId})</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => applySuggestion(g)} disabled={busy} className="btn-primary text-xs">✓ Apply merge</button>
                        <button onClick={() => setSuggestions(s => s.filter(x => x.keeperId !== g.keeperId))} className="btn-secondary text-xs">Reject</button>
                      </div>
                    </div>
                    <div className="text-xs space-y-1">
                      {g.members.map(m => (
                        <div key={m.id} className="flex items-start gap-2">
                          <span className="text-brand-700">→</span>
                          <div className="flex-1">
                            <span className="font-medium">{m.name}</span>
                            <span className="ml-2 text-brand-600">
                              {m.suggestedVariants.map((v, i) => (
                                <span key={i} className="inline-block ml-1 px-1.5 py-0.5 rounded bg-white border border-brand-200">
                                  {v.type}: {v.name}
                                </span>
                              ))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk toolbar — sticky when items selected */}
      {selected.size > 0 && (
        <div className="sticky top-14 z-30 bg-brand-700 text-white rounded-lg shadow-lg p-3 flex flex-wrap items-center gap-2">
          <span className="font-semibold mr-2">{selected.size} selected</span>

          <select className="text-sm rounded px-2 py-1.5 bg-white text-ink"
            value={bulkAction}
            onChange={e => { setBulkAction(e.target.value); setBulkPayload({}); }}>
            <option value="">Bulk action…</option>
            <option value="set-price">Set price</option>
            <option value="adjust-price">Adjust price (±%)</option>
            <option value="set-sale">Set sale price</option>
            <option value="clear-sale">Clear sale price</option>
            <option value="set-on-offer">Mark as on offer</option>
            <option value="clear-on-offer">Remove offer flag</option>
            <option value="set-featured">Mark featured</option>
            <option value="clear-featured">Unmark featured</option>
            <option value="set-active">Make active (visible)</option>
            <option value="set-hidden">Hide</option>
            <option value="set-stock">Set stock to</option>
            <option value="adjust-stock">Adjust stock (±)</option>
            <option value="set-category">Move to category</option>
            <option value="delete">🗑️ Delete</option>
          </select>

          {/* Action-specific inputs */}
          {bulkAction === "set-price" && (
            <input type="number" min="0" step="0.01" placeholder="New price (LKR)" className="text-sm rounded px-2 py-1.5 bg-white text-ink w-36"
              onChange={e => setBulkPayload({ value: parseFloat(e.target.value) })} />
          )}
          {bulkAction === "adjust-price" && (
            <input type="number" step="1" placeholder="e.g. 10 or -5" className="text-sm rounded px-2 py-1.5 bg-white text-ink w-32"
              onChange={e => setBulkPayload({ percent: parseFloat(e.target.value) })} />
          )}
          {bulkAction === "set-sale" && (
            <input type="number" min="0" step="0.01" placeholder="Sale price (LKR)" className="text-sm rounded px-2 py-1.5 bg-white text-ink w-36"
              onChange={e => setBulkPayload({ value: parseFloat(e.target.value) })} />
          )}
          {bulkAction === "set-stock" && (
            <input type="number" min="0" placeholder="New stock" className="text-sm rounded px-2 py-1.5 bg-white text-ink w-28"
              onChange={e => setBulkPayload({ value: parseInt(e.target.value) })} />
          )}
          {bulkAction === "adjust-stock" && (
            <input type="number" placeholder="e.g. 10 or -5" className="text-sm rounded px-2 py-1.5 bg-white text-ink w-32"
              onChange={e => setBulkPayload({ delta: parseInt(e.target.value) })} />
          )}
          {bulkAction === "set-category" && (
            <select className="text-sm rounded px-2 py-1.5 bg-white text-ink"
              onChange={e => setBulkPayload({ categoryId: e.target.value || null })}>
              <option value="">Choose category…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="">— No category —</option>
            </select>
          )}

          {bulkAction && (
            <button
              disabled={busy}
              onClick={() => {
                // Translate UI action → API action
                const mapped: Record<string, { action: string; payload: any }> = {
                  "set-price": { action: "set-price", payload: bulkPayload },
                  "adjust-price": { action: "adjust-price", payload: bulkPayload },
                  "set-sale": { action: "set-sale", payload: bulkPayload },
                  "clear-sale": { action: "set-sale", payload: { value: null } },
                  "set-on-offer": { action: "set-on-offer", payload: { value: true } },
                  "clear-on-offer": { action: "set-on-offer", payload: { value: false } },
                  "set-featured": { action: "set-featured", payload: { value: true } },
                  "clear-featured": { action: "set-featured", payload: { value: false } },
                  "set-active": { action: "set-active", payload: { value: true } },
                  "set-hidden": { action: "set-active", payload: { value: false } },
                  "set-stock": { action: "set-stock", payload: bulkPayload },
                  "adjust-stock": { action: "adjust-stock", payload: bulkPayload },
                  "set-category": { action: "set-category", payload: bulkPayload },
                  "delete": { action: "delete", payload: {} },
                };
                const m = mapped[bulkAction];
                if (m) runBulk(m.action, m.payload);
              }}
              className="px-3 py-1.5 rounded bg-white text-brand-700 text-sm font-semibold hover:bg-brand-50"
            >
              {busy ? "Working…" : "Apply"}
            </button>
          )}

          <button onClick={openMergeModal} disabled={busy || selected.size < 2}
            className="px-3 py-1.5 rounded bg-yellow-400 text-yellow-900 text-sm font-semibold hover:bg-yellow-300 disabled:opacity-50">
            🔗 Merge {selected.size} →
          </button>

          <button onClick={() => setSelected(new Set())} className="ml-auto text-sm underline opacity-90 hover:opacity-100">Clear selection</button>
        </div>
      )}

      {msg && (
        <div className={`text-sm p-2 rounded ${msg.startsWith("✓") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{msg}</div>
      )}

      {/* Product table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-50">
            <tr className="text-left">
              <th className="p-2 w-8"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
              <th className="p-2">Name</th>
              <th className="p-2">Category</th>
              <th className="p-2">SKU</th>
              <th className="p-2">Price</th>
              <th className="p-2">Stock</th>
              <th className="p-2">Status</th>
              <th className="p-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const missing = p.missing || [];
              const rowClass = selected.has(p.id)
                ? "bg-yellow-50"
                : missing.length > 0 ? "bg-amber-50/40" : "";
              return (
              <tr key={p.id} className={`border-t border-brand-100 ${rowClass}`}>
                <td className="p-2"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {missing.length === 0 ? (
                      <span title="Complete listing" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold shrink-0">✓</span>
                    ) : (
                      <span title={`Missing: ${missing.join(", ")}`} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold shrink-0">!</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link href={`/admin/products/${p.id}/edit`} className="text-brand-700 underline">{p.name}</Link>
                      {missing.length > 0 && (
                        <div className="text-[10px] text-amber-700 mt-0.5">
                          Missing: {missing.join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-2">{p.category?.name || "—"}</td>
                <td className="p-2">{p.sku || "—"}</td>
                <td className="p-2">{p.salePrice
                  ? <><span className="line-through text-brand-400 mr-1">{formatLKR(p.price)}</span>{formatLKR(p.salePrice)}</>
                  : formatLKR(p.price)}
                </td>
                <td className="p-2">{p.stock}</td>
                <td className="p-2 text-xs">{p.active ? "Active" : "Hidden"} {p.onOffer && "· Offer"} {p.featured && "· Featured"}</td>
                <td className="p-2 text-right">
                  <div className="flex gap-1 justify-end items-center">
                    <Link href={`/admin/products/${p.id}/edit`} className="px-2.5 py-1 rounded bg-brand-600 text-white text-xs hover:bg-brand-700">Edit</Link>
                    <button onClick={() => duplicateProduct(p.id)} disabled={busy}
                      title="Duplicate this product"
                      className="px-2.5 py-1 rounded bg-yellow-400 text-yellow-900 text-xs hover:bg-yellow-300 disabled:opacity-50">
                      ⎘ Copy
                    </button>
                    <button onClick={() => deleteProduct(p.id, p.name)} disabled={busy}
                      title="Delete this product"
                      className="px-2.5 py-1 rounded bg-red-50 text-red-700 border border-red-200 text-xs hover:bg-red-100 disabled:opacity-50">
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
            {products.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-brand-600">No products yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Manual merge modal */}
      {mergeOpen && keeperId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setMergeOpen(false)}>
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-brand-900">Merge {selectedProducts.length} products</h2>
              <button onClick={() => setMergeOpen(false)} className="text-brand-500 text-2xl leading-none">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Keeper (the product that stays — others will be merged into it)</label>
                <select className="input" value={keeperId} onChange={e => changeKeeper(parseInt(e.target.value))}>
                  {selectedProducts.map(p => <option key={p.id} value={p.id}>{p.name} (#{p.id})</option>)}
                </select>
                <p className="text-xs text-brand-600 mt-1">
                  Keeper's price, image, description are kept. Stocks are summed. Order history is preserved.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Members to merge into keeper</h3>
                <p className="text-xs text-brand-600 mb-3">For each member, label what variant attribute distinguishes it from the keeper (color, size, or both).</p>
                <div className="space-y-3">
                  {mergeMembers.map(m => (
                    <div key={m.id} className="border border-brand-200 rounded p-3">
                      <div className="font-medium text-sm mb-2">{m.name}</div>
                      <div className="space-y-2">
                        {m.variants.map((v, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <select className="input w-28" value={v.type} onChange={e => updateMemberVariant(m.id, i, "type", e.target.value)}>
                              <option value="color">Color</option>
                              <option value="size">Size</option>
                            </select>
                            <input className="input flex-1" placeholder='e.g. Black or "144 yards"' value={v.name}
                              onChange={e => updateMemberVariant(m.id, i, "name", e.target.value)} />
                            {m.variants.length > 1 && (
                              <button onClick={() => removeMemberVariant(m.id, i)} className="text-red-500 text-lg">✕</button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => addMemberVariant(m.id)} className="text-xs text-brand-700 underline">+ Add another variant attribute</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2 justify-end border-t border-brand-100 pt-4">
              <button onClick={() => setMergeOpen(false)} disabled={busy} className="btn-secondary">Cancel</button>
              <button onClick={executeMerge} disabled={busy} className="btn-primary">{busy ? "Merging…" : `🔗 Merge ${mergeMembers.length} into keeper`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
