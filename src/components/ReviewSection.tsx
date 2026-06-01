"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Review = { id: number; name: string; rating: number; title: string | null; body: string; createdAt: string };

export default function ReviewSection({ productId, initialReviews }: { productId: number; initialReviews: Review[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [me, setMe] = useState<{ fullName: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setMe(d.user));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, rating, title, body }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error || "Failed to submit"); return; }
    // optimistic add or replace
    setReviews((prev) => {
      const filtered = prev.filter((r) => r.id !== data.id);
      return [{ ...data, name: me?.fullName || "You", createdAt: new Date().toISOString() }, ...filtered];
    });
    setTitle(""); setBody("");
  }

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl text-brand-900 mb-2">Customer reviews</h2>
      {reviews.length > 0 ? (
        <div className="flex items-center gap-2 mb-4">
          <Stars value={Math.round(avg)} />
          <span className="text-sm text-brand-700">{avg.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
        </div>
      ) : (
        <p className="text-brand-700 mb-4">No reviews yet — be the first.</p>
      )}

      {me ? (
        <form onSubmit={submit} className="card p-4 mb-6 space-y-3">
          <h3 className="font-semibold">Write a review</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm">Rating:</span>
            <StarInput value={rating} onChange={setRating} />
          </div>
          <input className="input" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea required rows={3} className="input" placeholder="Share your experience…" value={body} onChange={(e) => setBody(e.target.value)} />
          {err && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{err}</div>}
          <button disabled={busy} className="btn-primary">{busy ? "Posting…" : "Post review"}</button>
        </form>
      ) : (
        <div className="card p-4 mb-6 bg-brand-50">
          <Link href="/account/login" className="text-brand-700 underline">Log in</Link> or{" "}
          <Link href="/account/register" className="text-brand-700 underline">create an account</Link> to leave a review.
        </div>
      )}

      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{r.name}</div>
              <Stars value={r.rating} />
            </div>
            {r.title && <div className="font-semibold mt-1">{r.title}</div>}
            <p className="mt-1 text-brand-800 whitespace-pre-line text-sm">{r.body}</p>
            <div className="text-xs text-brand-500 mt-1">{new Date(r.createdAt).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stars({ value }: { value: number }) {
  return <span className="text-amber-500">{"★".repeat(value)}<span className="text-brand-200">{"★".repeat(5 - value)}</span></span>;
}
function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} className={n <= value ? "text-amber-500" : "text-brand-200"}>★</button>
      ))}
    </span>
  );
}
