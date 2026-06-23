"use client";
import { useState, useEffect } from "react";
import { useCart, type CartVariant } from "./CartProvider";
import { useLanguage } from "./LanguageProvider";
import { formatLKR } from "@/lib/utils";

type Variant = {
  id: number;
  type: string;
  name: string;
  nameSi?: string | null;
  nameTa?: string | null;
  imageUrl: string | null;
  price?: number | null;
  salePrice?: number | null;
};

function variantDisplay(v: Variant, lang: string): string {
  if (lang === "si" && v.nameSi) return v.nameSi;
  if (lang === "ta" && v.nameTa) return v.nameTa;
  return v.name;
}

export default function ProductTopSection({
  product,
  images,
  variants,
  unitLabel,
  avgRating,
  reviewCount,
}: {
  product: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    salePrice: number | null;
    sku: string | null;
    imageUrl: string | null;
    stock: number;
  };
  images: string[];           // gallery (main + additional)
  variants: Variant[];
  unitLabel: string | null;
  avgRating: number;
  reviewCount: number;
}) {
  const { add } = useCart();
  const { lang, t } = useLanguage();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const vd = (v: Variant) => variantDisplay(v, lang);

  const colorVariants = variants.filter(v => v.type === "color");
  const sizeVariants = variants.filter(v => v.type === "size");
  const lengthVariants = variants.filter(v => v.type === "length");
  const packVariants = variants.filter(v => v.type === "pack");

  const [selColor, setSelColor] = useState<Variant | null>(null);
  const [selSize, setSelSize] = useState<Variant | null>(null);
  const [selLength, setSelLength] = useState<Variant | null>(null);
  const [selPack, setSelPack] = useState<Variant | null>(null);

  // Active main image — swaps to selected color's crop when available
  const [activeImage, setActiveImage] = useState<string | null>(images[0] || null);
  const [fading, setFading] = useState(false);

  // When color changes, swap the main image with a tiny crossfade.
  useEffect(() => {
    const next = selColor?.imageUrl || images[0] || null;
    if (next === activeImage) return;
    setFading(true);
    const t = setTimeout(() => {
      setActiveImage(next);
      setFading(false);
    }, 180);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selColor]);

  // Validation: every variant group that exists must have a selection
  const needsColor = colorVariants.length > 0 && !selColor;
  const needsSize = sizeVariants.length > 0 && !selSize;
  const needsLength = lengthVariants.length > 0 && !selLength;
  const needsPack = packVariants.length > 0 && !selPack;
  const ready = !needsColor && !needsSize && !needsLength && !needsPack;

  // ---- Universal pricing rule ----
  // For each selected variant:
  //   - If it has a price (or salePrice) set → use that effective amount
  //   - If not → contributes 0 (treated as "uses base")
  //
  // Final = (sum of priced variants' effective prices) OR base if none are priced.
  // This works for all common patterns:
  //   - Length-only pricing (elastic 36y/144y): only the length variant has a price → it wins
  //   - Pack vs piece: only the pack variant has a price → that price shows
  //   - Color pricing: only color has a price → color price shows
  //   - Mixed (rare): prices sum naturally (e.g. premium color + bigger pack)
  function variantEffective(v: Variant | null): number | null {
    if (!v) return null;
    if (v.price == null && v.salePrice == null) return null;
    return v.salePrice ?? v.price ?? null;
  }
  function variantRegular(v: Variant | null): number | null {
    if (!v) return null;
    if (v.price == null) return null;
    return v.price;
  }

  const baseEffective = product.salePrice ?? product.price;
  const baseRegular = product.price;
  // A base of 0 means "no base price set" — only variant pricing applies
  const validBase = baseEffective > 0 ? baseEffective : null;
  const validBaseRegular = baseRegular > 0 ? baseRegular : null;

  const selectedVariants = [selColor, selSize, selLength, selPack].filter(Boolean) as Variant[];
  const pricedSelected = selectedVariants.filter(v => v.price != null || v.salePrice != null);

  const effective = pricedSelected.length > 0
    ? pricedSelected.reduce((sum, v) => sum + (variantEffective(v) ?? 0), 0)
    : (validBase ?? 0);

  const regular = pricedSelected.length > 0
    ? pricedSelected.reduce((sum, v) => sum + (variantRegular(v) ?? variantEffective(v) ?? 0), 0)
    : (validBaseRegular ?? 0);

  const showStrikethrough = effective < regular;

  // For "From Rs.X" — shown ONLY when no priced variant is selected yet.
  // Once the customer picks any priced variant, we show the live calculated price.
  // Skip base when it's 0 (treat as "no price set") so it doesn't drag the min to zero.
  function minPossiblePrice(): number {
    const allPrices: number[] = [];
    if (validBase != null) allPrices.push(validBase);
    for (const v of variants) {
      const e = variantEffective(v);
      if (e != null && e > 0) allPrices.push(e);
    }
    return allPrices.length > 0 ? Math.min(...allPrices) : 0;
  }
  const hasVariantPricing = variants.some(v => v.price != null || v.salePrice != null);
  // Show "From" when either: variants are priced and none picked yet, OR base is missing entirely
  const showFromPrice = (hasVariantPricing || validBase == null) && pricedSelected.length === 0;
  const fromPrice = minPossiblePrice();

  // Dynamic title suffix — order: size, length OR pack OR fallback unit, color
  const titleParts: string[] = [];
  if (selSize) titleParts.push(vd(selSize));
  if (selLength) titleParts.push(vd(selLength));
  else if (selPack) titleParts.push(vd(selPack));
  // Only fall back to unitLabel when there are NO pack/length variants at all
  // (otherwise the customer is expected to pick one, and selPack/selLength fills this slot)
  else if (unitLabel && lengthVariants.length === 0 && packVariants.length === 0) {
    titleParts.push(unitLabel);
  }
  if (selColor) titleParts.push(vd(selColor));
  const titleSuffix = titleParts.length ? ` — ${titleParts.join(", ")}` : "";

  function addToCart() {
    if (!ready || product.stock <= 0) return;
    const sel: CartVariant[] = [];
    if (selColor) sel.push({ id: selColor.id, type: "color", name: vd(selColor) });
    if (selSize) sel.push({ id: selSize.id, type: "size", name: vd(selSize) });
    if (selLength) sel.push({ id: selLength.id, type: "length", name: vd(selLength) });
    if (selPack) sel.push({ id: selPack.id, type: "pack", name: vd(selPack) });

    const cartName = product.name + titleSuffix;

    add({
      productId: product.id,
      name: cartName,
      slug: product.slug,
      price: effective,  // already reflects highest selected variant price
      imageUrl: selColor?.imageUrl || product.imageUrl,
      variants: sel.length ? sel : undefined,
    }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  const maxQty = product.stock > 0 ? product.stock : 99;
  function decQty() { setQty(q => Math.max(1, q - 1)); }
  function incQty() { setQty(q => Math.min(maxQty, q + 1)); }
  function onQtyInput(e: React.ChangeEvent<HTMLInputElement>) {
    const n = parseInt(e.target.value, 10);
    if (isNaN(n)) { setQty(1); return; }
    setQty(Math.max(1, Math.min(maxQty, n)));
  }

  // Thumbnails: main image, additional images, and any color variant images
  const thumbnails = Array.from(new Set([
    ...images,
    ...colorVariants.filter(v => v.imageUrl).map(v => v.imageUrl!),
  ]));

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Image gallery */}
      <div>
        <div className="aspect-square bg-brand-50 rounded-lg overflow-hidden relative">
          {activeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeImage}
              alt={product.name + (selColor ? ` (${vd(selColor)})` : "")}
              className={`w-full h-full object-cover transition-opacity duration-200 ${fading ? "opacity-0" : "opacity-100"}`}
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-brand-300 text-7xl">🧵</div>
          )}
          {/* Subtle SH watermark — top-right, low opacity so it doesn't fight the product */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            aria-hidden
            className="absolute top-3 right-3 w-12 sm:w-14 h-auto opacity-30 pointer-events-none select-none mix-blend-luminosity"
          />
          {selColor && selColor.imageUrl && (
            <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
              Showing: <strong>{vd(selColor)}</strong>
            </div>
          )}
        </div>
        {thumbnails.length > 1 && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {thumbnails.map((url, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(url)}
                className={`w-16 h-16 rounded overflow-hidden border-2 transition ${
                  activeImage === url ? "border-brand-600" : "border-brand-200 hover:border-brand-400"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info + selectors */}
      <div>
        <h1 className="font-display text-3xl text-brand-900">
          {product.name}
          {titleSuffix && (
            <span className="text-brand-600 text-2xl">{titleSuffix}</span>
          )}
        </h1>

        {reviewCount > 0 && (
          <div className="mt-1 text-sm">
            <span className="text-amber-500">{"★".repeat(Math.round(avgRating))}</span>
            <span className="text-brand-700"> {avgRating.toFixed(1)} ({reviewCount} review{reviewCount === 1 ? "" : "s"})</span>
          </div>
        )}
        <div className="mt-3 flex items-baseline gap-3">
          {showFromPrice ? (
            <>
              <span className="text-sm text-brand-600">From</span>
              <span className="text-2xl font-semibold text-brand-700">{formatLKR(fromPrice)}</span>
            </>
          ) : (
            <>
              <span className="text-2xl font-semibold text-brand-700">{formatLKR(effective)}</span>
              {showStrikethrough && <span className="line-through text-brand-400">{formatLKR(regular)}</span>}
            </>
          )}
        </div>
        {product.sku && <div className="mt-1 text-xs text-brand-600">SKU: {product.sku}</div>}
        <div className={`mt-2 text-sm ${product.stock > 0 ? "text-green-700" : "text-red-700"}`}>
          {product.stock > 0 ? `In stock (${product.stock})` : "Out of stock"}
        </div>
        {product.description && <p className="mt-4 text-brand-800 whitespace-pre-line">{product.description}</p>}

        {/* Size selector */}
        {sizeVariants.length > 0 && (
          <div className="mt-4">
            <label className="text-sm font-medium text-brand-900 block mb-1">Size</label>
            <select
              className="input max-w-xs"
              value={selSize?.id ?? ""}
              onChange={e => setSelSize(sizeVariants.find(v => v.id === parseInt(e.target.value)) || null)}
            >
              <option value="">Select size…</option>
              {sizeVariants.map(v => <option key={v.id} value={v.id}>{vd(v)}</option>)}
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
              {lengthVariants.map(v => <option key={v.id} value={v.id}>{vd(v)}</option>)}
            </select>
          </div>
        )}

        {/* Pack / Unit selector */}
        {packVariants.length > 0 && (
          <div className="mt-4">
            <label className="text-sm font-medium text-brand-900 block mb-1">{t("pack_size")}</label>
            <select
              className="input max-w-xs"
              value={selPack?.id ?? ""}
              onChange={e => setSelPack(packVariants.find(v => v.id === parseInt(e.target.value)) || null)}
            >
              <option value="">Choose pack…</option>
              {packVariants.map(v => <option key={v.id} value={v.id}>{vd(v)}</option>)}
            </select>
            <p className="text-xs text-brand-500 mt-1">Bigger packs usually have a better per-unit price.</p>
          </div>
        )}

        {/* Color swatches */}
        {colorVariants.length > 0 && (
          <div className="mt-4">
            <label className="text-sm font-medium text-brand-900 block mb-1">
              {t("color")} {selColor && <span className="text-brand-600 font-normal">— {vd(selColor)}</span>}
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {colorVariants.map(v => (
                <button
                  key={v.id}
                  title={vd(v)}
                  onClick={() => setSelColor(selColor?.id === v.id ? null : v)}
                  className={`w-12 h-12 rounded overflow-hidden border-2 transition ${
                    selColor?.id === v.id ? "border-brand-600 ring-2 ring-brand-400" : "border-brand-200 hover:border-brand-400"
                  }`}
                >
                  {v.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.imageUrl} alt={vd(v)} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-brand-700 p-1">{vd(v)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 max-w-xs space-y-3">
          {/* Quantity stepper */}
          <div>
            <label className="text-sm font-medium text-brand-900 block mb-1">{t("quantity_label")}</label>
            <div className="inline-flex items-center rounded-lg border border-brand-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={decQty}
                disabled={qty <= 1 || product.stock <= 0}
                className="w-10 h-10 text-lg font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Decrease quantity"
              >−</button>
              <input
                type="number"
                min="1"
                max={maxQty}
                value={qty}
                onChange={onQtyInput}
                disabled={product.stock <= 0}
                className="w-14 h-10 text-center font-semibold text-brand-900 bg-transparent outline-none border-x border-brand-200 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={incQty}
                disabled={qty >= maxQty || product.stock <= 0}
                className="w-10 h-10 text-lg font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Increase quantity"
              >+</button>
            </div>
            {product.stock > 0 && product.stock <= 10 && (
              <p className="text-xs text-amber-700 mt-1">{t("only_x_left").replace("{n}", String(product.stock))}</p>
            )}
          </div>

          <button
            disabled={!ready || product.stock <= 0}
            onClick={addToCart}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {added
              ? `${t("added")}${qty > 1 ? ` (${qty})` : ""}`
              : !ready
                ? t("choose_options")
                : product.stock <= 0
                  ? t("out_of_stock")
                  : `${t("add_to_cart")}${qty > 1 ? ` (${qty})` : ""}`
            }
          </button>
        </div>

        <div className="mt-6 text-sm text-brand-700 space-y-1">
          <div>✓ {t("cod_available")}</div>
          <div>✓ {t("bank_accepted")}</div>
          <div>✓ {t("islandwide_delivery")}</div>
        </div>
      </div>
    </div>
  );
}
