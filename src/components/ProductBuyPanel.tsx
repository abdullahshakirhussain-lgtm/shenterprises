"use client";
import { useState } from "react";
import { useCart, type CartVariant } from "./CartProvider";

type Variant = { id: number; type: string; name: string; imageUrl: string | null };

export default function ProductBuyPanel({
  product,
  variants,
  unitLabel,
}: {
  product: { id: number; name: string; slug: string; price: number; imageUrl: string | null; stock: number };
  variants: Variant[];
  unitLabel: string | null; // e.g. "100 pieces" — shown when no length variant
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const colorVariants = variants.filter(v => v.type === "color");
  const sizeVariants = variants.filter(v => v.type === "size");
  const lengthVariants = variants.filter(v => v.type === "length");

  const [selColor, setSelColor] = useState<Variant | null>(null);
  const [selSize, setSelSize] = useState<Variant | null>(null);
  const [selLength, setSelLength] = useState<Variant | null>(null);

  // Validation: every variant group that exists must have a selection
  const needsColor = colorVariants.length > 0 && !selColor;
  const needsSize = sizeVariants.length > 0 && !selSize;
  const needsLength = lengthVariants.length > 0 && !selLength;
  const ready = !needsColor && !needsSize && !needsLength;

  // Dynamic title parts: variants take precedence, fall back to base unit
  const titleParts: string[] = [];
  if (selSize) titleParts.push(selSize.name);
  if (selLength) titleParts.push(selLength.name);
  else if (unitLabel && lengthVariants.length === 0) titleParts.push(unitLabel);
  if (selColor) titleParts.push(selColor.name);
  const titleSuffix = titleParts.length ? ` — ${titleParts.join(", ")}` : "";

  function addToCart() {
    if (!ready || product.stock <= 0) return;
    const sel: CartVariant[] = [];
    if (selColor) sel.push({ id: selColor.id, type: "color", name: selColor.name });
    if (selSize) sel.push({ id: selSize.id, type: "size", name: selSize.name });
    if (selLength) sel.push({ id: selLength.id, type: "length", name: selLength.name });

    // Build cart line name: include variant labels OR unit when product has no length variants
    const cartName = product.name + titleSuffix;

    add({
      productId: product.id,
      name: cartName,
      slug: product.slug,
      price: product.price,
      imageUrl: selColor?.imageUrl || product.imageUrl,
      variants: sel.length ? sel : undefined,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div>
      {/* Display selected name */}
      <div className="text-base text-brand-700 mb-3 min-h-[1.5em]">
        <span className="text-brand-900 font-semibold">{product.name}</span>
        <span className="text-brand-600">{titleSuffix}</span>
      </div>

      {/* Size selector first (per design preference) */}
      {sizeVariants.length > 0 && (
        <div className="mt-4">
          <label className="text-sm font-medium text-brand-900 block mb-1">Size</label>
          <select
            className="input max-w-xs"
            value={selSize?.id ?? ""}
            onChange={e => setSelSize(sizeVariants.find(v => v.id === parseInt(e.target.value)) || null)}
          >
            <option value="">Select size…</option>
            {sizeVariants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      )}

      {/* Length selector */}
      {lengthVariants.length > 0 && (
        <div className="mt-4">
          <label className="text-sm font-medium text-brand-900 block mb-1">Length</label>
          <select
            className="input max-w-xs"
            value={selLength?.id ?? ""}
            onChange={e => setSelLength(lengthVariants.find(v => v.id === parseInt(e.target.value)) || null)}
          >
            <option value="">Select length…</option>
            {lengthVariants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      )}

      {/* Color swatches */}
      {colorVariants.length > 0 && (
        <div className="mt-4">
          <label className="text-sm font-medium text-brand-900 block mb-1">Color</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {colorVariants.map(v => (
              <button
                key={v.id}
                title={v.name}
                onClick={() => setSelColor(selColor?.id === v.id ? null : v)}
                className={`w-12 h-12 rounded overflow-hidden border-2 transition ${
                  selColor?.id === v.id ? "border-brand-600 ring-2 ring-brand-400" : "border-brand-200 hover:border-brand-400"
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
            {selColor && (
              <span className="self-center text-sm text-brand-700 ml-1">{selColor.name}</span>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 max-w-xs">
        <button
          disabled={!ready || product.stock <= 0}
          onClick={addToCart}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {added ? "✓ Added to cart" : !ready ? "Choose options" : product.stock <= 0 ? "Out of stock" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
