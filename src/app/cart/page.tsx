"use client";
import { useCart } from "@/components/CartProvider";
import { formatLKR } from "@/lib/utils";
import Link from "next/link";

export default function CartPage() {
  const { items, subtotal, setQty, remove, clear } = useCart();
  return (
    <div className="container-x py-8">
      <h1 className="font-display text-3xl text-brand-900 mb-6">Your cart</h1>
      {items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-brand-700 mb-4">Your cart is empty.</p>
          <Link href="/" className="btn-primary">Continue shopping</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            {items.map((i) => (
              <div key={i.key} className="card p-3 flex gap-3 items-center">
                <div className="w-20 h-20 bg-brand-50 rounded shrink-0 overflow-hidden">
                  {i.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.imageUrl} alt={i.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${i.slug}`} className="font-medium hover:text-brand-700 line-clamp-2">{i.name}</Link>
                  {i.variants && i.variants.length > 0 && (
                    <div className="text-xs text-brand-600 mt-0.5">
                      {i.variants.map(v => `${v.type === "color" ? "Color" : v.type === "size" ? "Size" : "Length"}: ${v.name}`).join(" · ")}
                    </div>
                  )}
                  <div className="text-sm text-brand-700">{formatLKR(i.price)} each</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-secondary px-2 py-1" onClick={() => setQty(i.key, i.quantity - 1)}>−</button>
                  <span className="w-8 text-center">{i.quantity}</span>
                  <button className="btn-secondary px-2 py-1" onClick={() => setQty(i.key, i.quantity + 1)}>+</button>
                </div>
                <div className="w-24 text-right font-semibold">{formatLKR(i.price * i.quantity)}</div>
                <button onClick={() => remove(i.key)} className="text-red-600 px-2" aria-label="Remove">✕</button>
              </div>
            ))}
            <button onClick={clear} className="text-sm text-brand-600 underline">Clear cart</button>
          </div>
          <div className="card p-4 h-fit">
            <h2 className="font-semibold text-lg mb-3">Order summary</h2>
            <div className="flex justify-between mb-2"><span>Subtotal</span><span>{formatLKR(subtotal)}</span></div>
            <div className="text-xs text-brand-600 mb-4">Delivery calculated at checkout based on district.</div>
            <Link href="/checkout" className="btn-primary w-full">Checkout</Link>
          </div>
        </div>
      )}
    </div>
  );
}
