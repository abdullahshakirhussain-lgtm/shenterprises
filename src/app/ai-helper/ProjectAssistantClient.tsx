"use client";
import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatLKR } from "@/lib/utils";

type Suggestion = {
  productId: number;
  slug: string;
  name: string;
  quantity: number;
  reason: string;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  stock: number;
};

const STARTER_IDEAS = [
  "Baby blanket, 1m × 1m",
  "School uniform for a 7-year-old",
  "Saree blouse for a wedding",
  "Birthday banner with 20 letters",
  "Cushion covers, set of 4",
  "Curtains for a small bedroom window",
];

export default function ProjectAssistantClient() {
  const { add } = useCart();
  const [project, setProject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [translated, setTranslated] = useState<string | null>(null);
  const [addedAll, setAddedAll] = useState(false);

  async function submit() {
    const text = project.trim();
    if (text.length < 4) {
      setError("Please describe your project in a bit more detail.");
      return;
    }
    setLoading(true);
    setError("");
    setSummary("");
    setItems([]);
    setTranslated(null);
    setAddedAll(false);
    try {
      const res = await fetch("/api/ai/project-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSummary(data.summary || "");
      setItems(data.items || []);
      setTranslated(data.translatedQuery || null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function updateQty(productId: number, qty: number) {
    setItems(it => it.map(s => s.productId === productId ? { ...s, quantity: Math.max(1, qty) } : s));
  }

  function removeItem(productId: number) {
    setItems(it => it.filter(s => s.productId !== productId));
  }

  function addAll() {
    for (const s of items) {
      if (s.stock <= 0) continue;
      add({
        productId: s.productId,
        name: s.name,
        slug: s.slug,
        price: s.price,
        imageUrl: s.imageUrl,
      }, s.quantity);
    }
    setAddedAll(true);
  }

  const total = items.reduce((sum, s) => sum + s.price * s.quantity, 0);
  const inStockCount = items.filter(s => s.stock > 0).length;

  return (
    <div className="reveal">
      {/* Starter prompts */}
      {items.length === 0 && !loading && (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-2">Quick ideas</p>
          <div className="flex flex-wrap gap-2">
            {STARTER_IDEAS.map(idea => (
              <button
                key={idea}
                type="button"
                onClick={() => setProject(idea)}
                className="text-sm px-3 py-1.5 rounded-full border border-brand-200 bg-white text-brand-800 hover:bg-brand-50 hover:border-brand-300 transition"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="rounded-2xl border border-brand-200 bg-white shadow-sm p-4 sm:p-5">
        <label className="block text-sm font-bold text-brand-900 mb-2">What are you making?</label>
        <textarea
          rows={3}
          className="input resize-none"
          placeholder="e.g. I'm making a baby blanket for my niece, about 1m by 1m, in pink cotton…"
          value={project}
          onChange={e => setProject(e.target.value)}
          maxLength={500}
          disabled={loading}
        />
        <div className="flex items-center justify-between mt-3 gap-3">
          <span className="text-xs text-muted">{project.length}/500 — Sinhala and Tamil welcome</span>
          <button
            onClick={submit}
            disabled={loading || project.trim().length < 4}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? "Thinking…" : "✨ Get suggestions"}
          </button>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm p-3">{error}</div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-xl bg-white border border-brand-100 p-4 animate-pulse flex gap-3">
              <div className="w-16 h-16 bg-brand-100 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-brand-100 rounded w-3/4" />
                <div className="h-3 bg-brand-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && items.length > 0 && (
        <div className="mt-6 space-y-4">
          {translated && (
            <p className="text-xs text-muted italic">Understood as: &ldquo;{translated}&rdquo;</p>
          )}
          {summary && (
            <div className="rounded-2xl bg-brand-50 border border-brand-200 p-4">
              <p className="text-sm font-bold text-brand-900 mb-1">Here&apos;s what you&apos;ll need:</p>
              <p className="text-brand-800 leading-relaxed">{summary}</p>
            </div>
          )}

          <div className="space-y-2">
            {items.map(s => {
              const outOfStock = s.stock <= 0;
              return (
                <div key={s.productId} className={`rounded-xl bg-white border ${outOfStock ? "border-brand-100 opacity-60" : "border-brand-200"} p-3 sm:p-4 flex gap-3 sm:gap-4`}>
                  <Link href={`/product/${s.slug}`} className="shrink-0">
                    {s.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.imageUrl} alt={s.name} className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg" />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-brand-100 grid place-items-center text-brand-400 text-2xl">🧵</div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${s.slug}`} className="font-bold text-brand-900 hover:text-brand-700 leading-tight block truncate">{s.name}</Link>
                    {s.reason && <p className="text-xs text-muted mt-1 leading-snug">{s.reason}</p>}
                    {outOfStock && <p className="text-xs text-red-700 font-bold mt-1">Out of stock</p>}
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateQty(s.productId, s.quantity - 1)}
                          className="w-7 h-7 rounded border border-brand-200 text-brand-700 hover:bg-brand-50 font-bold leading-none"
                          aria-label="Decrease quantity"
                          disabled={outOfStock}
                        >−</button>
                        <span className="w-8 text-center font-bold text-sm">{s.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(s.productId, s.quantity + 1)}
                          className="w-7 h-7 rounded border border-brand-200 text-brand-700 hover:bg-brand-50 font-bold leading-none"
                          aria-label="Increase quantity"
                          disabled={outOfStock}
                        >+</button>
                        <button
                          type="button"
                          onClick={() => removeItem(s.productId)}
                          className="ml-2 text-xs text-red-600 hover:text-red-800 underline"
                        >Remove</button>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-brand-900">{formatLKR(s.price * s.quantity)}</div>
                        {s.quantity > 1 && <div className="text-[10px] text-muted">{formatLKR(s.price)} each</div>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-2 z-10 rounded-2xl bg-brand-600 text-white shadow-lg p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs text-brand-100 uppercase tracking-wide">Estimated total</div>
              <div className="text-2xl font-bold">{formatLKR(total)}</div>
            </div>
            {addedAll ? (
              <Link href="/cart" className="px-5 py-3 rounded-xl bg-white text-brand-700 font-bold hover:bg-brand-50 transition">
                ✓ Added — view cart →
              </Link>
            ) : (
              <button
                onClick={addAll}
                disabled={inStockCount === 0}
                className="px-5 py-3 rounded-xl bg-white text-brand-700 font-bold hover:bg-brand-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inStockCount === 0 ? "All out of stock" : `Add all ${inStockCount} to cart →`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty results — model returned 0 items */}
      {!loading && summary && items.length === 0 && (
        <div className="mt-6 rounded-2xl bg-brand-50 border border-brand-200 p-5 text-center">
          <p className="text-brand-900">{summary}</p>
          <p className="text-sm text-muted mt-2">Try describing your project differently or <Link href="/shop" className="text-brand-700 underline font-bold">browse the catalog</Link>.</p>
        </div>
      )}
    </div>
  );
}
