import { listingPrice } from "@/lib/commerce";
import Link from "next/link";
import { formatLKR, unitLabel as formatUnit } from "@/lib/utils";
import SmartImage from "@/components/SmartImage";
import { getServerLang } from "@/lib/i18n-server";
import { productName } from "@/lib/seoLang";

type Variant = { type: string; name: string; price?: number | null; salePrice?: number | null; outOfStock?: boolean };

type Product = {
  id: number;
  name: string;
  nameSi?: string | null;
  nameTa?: string | null;
  slug: string;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  onOffer?: boolean;
  stock?: number;
  outOfStock?: boolean;
  unitQty?: number | null;
  unitType?: string | null;
  variants?: Variant[];
};

/**
 * The one product card used everywhere (home, shop, category, search, offers,
 * related products) so listings look the same across the site.
 * `egg-prod` / `img` are hooks for the homepage easter eggs.
 */
// Server component: shows the Sinhala/Tamil name on /si and /ta pages.
export default async function ProductCard({ p, badge, badgeColor, priority = false }: { p: Product; badge?: string; badgeColor?: string; priority?: boolean }) {
  const name = productName(p, await getServerLang());
  const quote = listingPrice(p);
  const available = quote.available;
  const effective = quote.min;
  const showFrom = quote.from;
  const noBaseNoVariants = effective <= 0;
  const validBase = p.price > 0 ? p.price : null;
  const variants = (p.variants || []).filter(v => !v.outOfStock);
  const unitLabel = formatUnit(p.unitQty, p.unitType);
  const sizes = variants.filter(v => v.type === "size");
  const lengths = variants.filter(v => v.type === "length");
  const colors = variants.filter(v => v.type === "color");
  const packs = variants.filter(v => v.type === "pack");
  const discount = p.salePrice && p.price > 0 && p.salePrice < p.price ? Math.round(((p.price - p.salePrice) / p.price) * 100) : 0;
  const tag = badge || (p.onOffer && discount > 0 ? `-${discount}%` : null);

  return (
    <Link href={`/product/${p.slug}`} className="egg-prod tile flex flex-col rounded-2xl bg-white border border-brand-100 hover:border-saffron-300 shadow-sm overflow-hidden">
      <div className="img relative grid place-items-center aspect-square bg-brand-50 text-6xl overflow-hidden">
        {!available ? (
          <span className="absolute top-2 left-2 rounded-full bg-ink text-cream text-[11px] font-bold px-2.5 py-1 z-10 shadow">Out of stock</span>
        ) : tag ? (
          <span className={`absolute top-2 left-2 rounded-full ${badgeColor || "bg-saffron-600"} text-white text-[11px] font-bold px-2.5 py-1 z-10 shadow`}>{tag}</span>
        ) : null}
        {p.imageUrl ? (
          <SmartImage src={p.imageUrl} alt={name} priority={priority} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px" />
        ) : (
          <span aria-hidden>🧵</span>
        )}
      </div>
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <h3 className="font-display font-semibold text-[15px] sm:text-lg leading-snug text-balance text-ink line-clamp-3">
          {name}
          {unitLabel && lengths.length === 0 && <span className="text-ink-mute font-normal"> — {unitLabel}</span>}
        </h3>
        {(sizes.length > 0 || lengths.length > 0 || packs.length > 0 || colors.length > 1) && (
          <div className="text-[11px] mt-1 space-y-0.5">
            {sizes.length > 0 && <PillRow label="Sizes" items={sizes.map(v => v.name)} />}
            {lengths.length > 0 && <PillRow label="Lengths" items={lengths.map(v => v.name)} />}
            {packs.length > 0 && <PillRow label="Packs" items={packs.map(v => v.name)} />}
            {colors.length > 1 && <div className="text-ink-mute">{colors.length} colours</div>}
          </div>
        )}
        <div className="mt-auto pt-2">
          {!available ? (
            // Out of stock — never show a price.
            <p className="text-sm font-semibold text-red-600">Out of stock</p>
          ) : noBaseNoVariants ? (
            <p className="text-sm text-ink-mute">See options</p>
          ) : (
            // flex-wrap: a struck-through old price drops to its own line instead of being clipped.
            <p className="flex flex-wrap items-baseline gap-x-2">
              {showFrom && <span className="text-xs text-ink-mute">From</span>}
              <span className="font-display font-bold text-saffron-700 text-lg whitespace-nowrap">{formatLKR(effective)}</span>
              {!showFrom && effective === p.salePrice && validBase != null && p.salePrice && (
                <span className="text-ink-mute text-sm line-through whitespace-nowrap">{formatLKR(p.price)}</span>
              )}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function PillRow({ label, items }: { label: string; items: string[] }) {
  const display = items.slice(0, 3);
  const extra = items.length - display.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-ink-mute">{label}:</span>
      {display.map((n, i) => (
        <span key={i} className="inline-block px-1.5 py-0 rounded bg-saffron-50 border border-saffron-200/60 text-saffron-700">{n}</span>
      ))}
      {extra > 0 && <span className="text-ink-mute">+{extra}</span>}
    </div>
  );
}
