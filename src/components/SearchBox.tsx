"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Suggestion = {
  id: number;
  name: string;
  slug: string;
  price: number;
  imageUrl: string | null;
  unitLabel: string | null;
};

export default function SearchBox({
  placeholder, submitLabel, className,
}: {
  placeholder: string;
  submitLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  // Debounced suggestion fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results || []);
        if (focused) setOpen(true);
        setActiveIdx(-1);
      } catch {}
    }, 200);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [q, focused]);

  // Click outside closes dropdown
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function onKey(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(-1, i - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      const s = results[activeIdx];
      setOpen(false);
      router.push(`/product/${s.slug}`);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function fmt(n: number) { return "Rs. " + n.toLocaleString("en-LK", { minimumFractionDigits: 2 }); }

  return (
    <div ref={ref} className={`relative ${className || ""}`}>
      <form action="/search" className="flex items-center rounded-lg border border-brand-200 bg-white overflow-hidden">
        <input
          name="q"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => { setFocused(true); if (results.length > 0) setOpen(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={onKey}
          placeholder={placeholder}
          autoComplete="off"
          className="flex-1 px-4 py-2.5 text-sm outline-none bg-transparent"
        />
        <button className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors">
          {submitLabel}
        </button>
      </form>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-brand-200 rounded-lg shadow-xl z-50 overflow-hidden">
          {results.map((r, i) => (
            <Link
              key={r.id}
              href={`/product/${r.slug}`}
              onClick={() => setOpen(false)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`flex items-center gap-3 px-3 py-2 hover:bg-brand-50 transition-colors border-b border-brand-100 last:border-b-0 ${
                activeIdx === i ? "bg-brand-50" : ""
              }`}
            >
              <div className="w-10 h-10 rounded bg-brand-50 grid place-items-center overflow-hidden shrink-0">
                {r.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>🧵</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink truncate">
                  {r.name}
                  {r.unitLabel && <span className="text-muted"> — {r.unitLabel}</span>}
                </div>
                <div className="text-xs text-brand-700 font-semibold">{fmt(r.price)}</div>
              </div>
            </Link>
          ))}
          <Link
            href={`/search?q=${encodeURIComponent(q)}`}
            onClick={() => setOpen(false)}
            className="block text-center text-sm py-2 text-brand-700 hover:bg-brand-50 font-medium border-t border-brand-200"
          >
            See all results for “{q}” →
          </Link>
        </div>
      )}
    </div>
  );
}
