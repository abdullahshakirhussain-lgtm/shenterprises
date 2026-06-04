"use client";
import { useState } from "react";

type Variant = { id: number; name: string; imageUrl?: string | null };

export function ProductVariantSelector({ type, variants }: { type: "size" | "color"; variants: Variant[] }) {
  const [selected, setSelected] = useState<number | null>(null);

  if (type === "size") {
    return (
      <select
        className="input max-w-xs mt-1"
        value={selected ?? ""}
        onChange={e => setSelected(e.target.value ? parseInt(e.target.value) : null)}
      >
        <option value="">Select size…</option>
        {variants.map(v => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {variants.map(v => (
        <button
          key={v.id}
          title={v.name}
          onClick={() => setSelected(selected === v.id ? null : v.id)}
          className={`w-12 h-12 rounded overflow-hidden border-2 transition ${
            selected === v.id ? "border-brand-600 ring-2 ring-brand-400" : "border-brand-200 hover:border-brand-400"
          }`}
        >
          {v.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-brand-700 p-1">{v.name}</span>
          )}
        </button>
      ))}
      {selected && (
        <span className="self-center text-sm text-brand-700 ml-1">
          {variants.find(v => v.id === selected)?.name}
        </span>
      )}
    </div>
  );
}
