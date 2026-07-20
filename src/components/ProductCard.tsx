import Link from "next/link";
import { formatLKR } from "@/lib/utils";
import SmartImage from "@/components/SmartImage";

type Variant = { type: string; name: string; price?: number | null; salePrice?: number | null };

type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  onOffer: boolean;
  stock: number;
  outOfStock?: boolean;
  unitQty?: number | null;
  unitType?: string | null;
  variants?: Variant[];
};

export default function ProductCard({ p }: { p: Product }) {
  const baseEffective = p.salePrice ?? p.price;
  const validBase = baseEffective > 0 ? baseEffective : null;
  const variantPrices = (p.variants || [])
    .map(v => (v.salePrice ?? v.price))
    .filter((n): n is number => n != null && n > 0);
  const hasVariantPricing = variantPrices.length > 0;
  const priceCandidates = [...(validBase != null ? [validBase] : []), ...variantPrices];
  const effective = priceCandidates.length > 0 ? Math.min(...priceCandidates) : 0;
  // "From" when there are multiple distinct prices, OR base is missing but variants exist
  const distinct = new Set(priceCandidates).size;
  const showFrom = distinct > 1;
  const noBaseNoVariants = priceCandidates.length === 0;
  const unitLabel = p.unitQty && p.unitType ? `${p.unitQty} ${p.unitType}` : null;

  const variants = p.variants || [];
  const sizes = variants.filter(v => v.type === "size");
  const lengths = variants.filter(v => v.type === "length");
  const colors = variants.filter(v => v.type === "color");
  const packs = variants.filter(v => v.type === "pack");

  return (
    <div className="card group flex flex-col">
      <Link href={`/product/${p.slug}`} className="block relative aspect-square bg-brand-50 overflow-hidden">
        {p.imageUrl ? (
          <SmartImage src={p.imageUrl} alt={p.name} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px" className="group-hover:scale-105 transition" />
        ) : (
          <div className="w-full h-full grid place-items-center text-brand-300 text-5xl">🧵</div>
        )}
        {p.onOffer && p.salePrice && (
          <span className="absolute top-2 left-2 bg-brand-600 text-white text-xs px-2 py-1 rounded">
            -{Math.round(((p.price - p.salePrice) / p.price) * 100)}%
          </span>
        )}
      </Link>
      <div className="p-3 flex flex-col flex-1 gap-2">
        <Link href={`/product/${p.slug}`} className="font-medium text-sm line-clamp-2 hover:text-brand-700">
          {p.name}
          {unitLabel && lengths.length === 0 && (
            <span className="text-brand-500"> — {unitLabel}</span>
          )}
        </Link>

        {/* Variant pills */}
        {(sizes.length > 0 || lengths.length > 0 || packs.length > 0 || colors.length > 1) && (
          <div className="text-xs space-y-0.5 -mt-0.5">
            {sizes.length > 0 && (
              <VariantPills label="Sizes" items={sizes.map(v => v.name)} />
            )}
            {lengths.length > 0 && (
              <VariantPills label="Lengths" items={lengths.map(v => v.name)} />
            )}
            {packs.length > 0 && (
              <VariantPills label="Packs" items={packs.map(v => v.name)} />
            )}
            {colors.length > 1 && (
              <div className="text-brand-500">{colors.length} colors</div>
            )}
          </div>
        )}

        <div className="mt-auto">
          <div className="flex items-baseline gap-2">
            {noBaseNoVariants ? (
              <span className="text-xs text-brand-500">See options</span>
            ) : (
              <>
                {showFrom && <span className="text-xs text-brand-600">From</span>}
                <span className="font-semibold text-brand-700">{formatLKR(effective)}</span>
                {!showFrom && validBase != null && p.salePrice && (
                  <span className="text-xs line-through text-brand-400">{formatLKR(p.price)}</span>
                )}
              </>
            )}
          </div>
          {p.outOfStock && <div className="text-xs text-red-600 mt-1">Out of stock</div>}
        </div>
      </div>
    </div>
  );
}

function VariantPills({ label, items }: { label: string; items: string[] }) {
  const display = items.slice(0, 4);
  const extra = items.length - display.length;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-brand-500">{label}:</span>
      {display.map((n, i) => (
        <span key={i} className="inline-block px-1.5 py-0.5 rounded bg-brand-50 border border-brand-200 text-brand-700 text-[10px]">{n}</span>
      ))}
      {extra > 0 && <span className="text-brand-500 text-[10px]">+{extra}</span>}
    </div>
  );
}
