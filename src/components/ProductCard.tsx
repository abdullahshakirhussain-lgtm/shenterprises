import Link from "next/link";
import { formatLKR } from "@/lib/utils";
import AddToCartButton from "./AddToCartButton";

type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  onOffer: boolean;
  stock: number;
};

export default function ProductCard({ p }: { p: Product }) {
  const effective = p.salePrice ?? p.price;
  return (
    <div className="card group flex flex-col">
      <Link href={`/product/${p.slug}`} className="block relative aspect-square bg-brand-50 overflow-hidden">
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
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
        </Link>
        <div className="mt-auto">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-brand-700">{formatLKR(effective)}</span>
            {p.salePrice && <span className="text-xs line-through text-brand-400">{formatLKR(p.price)}</span>}
          </div>
          <AddToCartButton
            product={{ id: p.id, name: p.name, slug: p.slug, price: effective, imageUrl: p.imageUrl }}
            disabled={p.stock <= 0}
            small
          />
          {p.stock <= 0 && <div className="text-xs text-red-600 mt-1">Out of stock</div>}
        </div>
      </div>
    </div>
  );
}
