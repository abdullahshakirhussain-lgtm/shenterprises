"use client";
import { useState } from "react";
import Link from "next/link";
import SmartImage from "@/components/SmartImage";

type Item = { productId: number; name: string; slug: string; imageUrl: string | null };

export default function OrderReviewForm({ code, items }: { code: string; items: Item[] }) {
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const rated = Object.keys(ratings).length;

  async function submit() {
    if (!rated) { setErr("Tap the stars on at least one item."); return; }
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/reviews/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, reviews: Object.entries(ratings).map(([id, rating]) => ({ productId: Number(id), rating, body: texts[Number(id)] || "" })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error || "Couldn't save your review. Please try again."); return; }
      setDone(true);
    } catch { setErr("Network error. Please try again."); } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="card p-6 mt-6 text-center">
        <p className="font-display text-xl text-ink">Thank you!</p>
        <p className="text-sm text-ink-mute mt-1">Your review{rated > 1 ? "s are" : " is"} now on the product page{rated > 1 ? "s" : ""}.</p>
        <Link href="/shop" className="inline-block mt-4 rounded-xl bg-ink text-cream text-sm font-bold px-5 py-3">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {items.map(item => (
        <div key={item.productId} className="card p-4">
          <div className="flex gap-3 items-center">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-brand-50 shrink-0">
              <SmartImage src={item.imageUrl} alt={item.name} sizes="64px" />
            </div>
            <p className="font-semibold text-ink leading-snug">{item.name}</p>
          </div>
          <div className="flex gap-1 mt-3" role="radiogroup" aria-label={`Rate ${item.name}`}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" role="radio" aria-checked={ratings[item.productId] === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setRatings(r => ({ ...r, [item.productId]: n }))}
                className={`w-11 h-11 text-3xl leading-none ${n <= (ratings[item.productId] || 0) ? "text-amber-500" : "text-brand-200"}`}>★</button>
            ))}
          </div>
          {ratings[item.productId] && (
            <textarea rows={2} maxLength={1000} className="input mt-2" placeholder="What did you like, or what could be better? (optional)"
              value={texts[item.productId] || ""} onChange={e => setTexts(t => ({ ...t, [item.productId]: e.target.value }))} />
          )}
        </div>
      ))}
      {err && <div className="text-sm text-red-700 bg-red-50 p-2 rounded" role="alert">{err}</div>}
      <button onClick={submit} disabled={busy} className="btn-primary w-full">{busy ? "Saving…" : `Submit review${rated > 1 ? "s" : ""}`}</button>
    </div>
  );
}
