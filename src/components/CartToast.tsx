"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Slide-up toast that appears every time an item is added to the cart.
 * Listens for the window event 'sh:cart-added' fired by:
 *   - CartProvider (main site)
 *   - CatalogClient (WhatsApp-style catalog)
 *
 * Shows for ~2.5 seconds. Multiple rapid adds collapse into one toast that
 * updates its text (no stack — keeps the UI calm).
 */

type Detail = { name?: string; quantity?: number; imageUrl?: string | null; cartHref?: string };

export default function CartToast() {
  const pathname = usePathname();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onAdd(e: Event) {
      const d = (e as CustomEvent<Detail>).detail || {};
      setDetail(d);
      setVisible(true);
    }
    window.addEventListener("sh:cart-added", onAdd);
    return () => window.removeEventListener("sh:cart-added", onAdd);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(t);
  }, [visible, detail]);

  if (!detail) return null;

  // On the catalog page the cart link should go to its own drawer; the catalog
  // sets cartHref via the event detail. Default to /cart for the main site.
  const cartHref = detail.cartHref || "/cart";
  const onCatalog = pathname?.startsWith("/catalog");

  return (
    <div
      className={`pointer-events-none fixed left-1/2 -translate-x-1/2 z-[60] transition-all duration-300 ${
        visible ? "bottom-20 sm:bottom-6 opacity-100" : "bottom-0 opacity-0"
      }`}
      aria-live="polite"
    >
      <div className="pointer-events-auto inline-flex items-center gap-3 bg-ink text-cream rounded-full pl-2 pr-4 py-2 shadow-2xl border border-saffron-500/30 max-w-[90vw]">
        {detail.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={detail.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-cream/20" />
        ) : (
          <span className="grid place-items-center w-8 h-8 rounded-full bg-saffron-500 text-cream font-bold">✓</span>
        )}
        <div className="flex flex-col leading-tight">
          <span className="text-xs text-saffron-300 font-semibold">Added to cart</span>
          {detail.name && (
            <span className="text-sm font-medium truncate max-w-[200px]">
              {detail.quantity && detail.quantity > 1 ? `${detail.quantity} × ` : ""}{detail.name}
            </span>
          )}
        </div>
        {!onCatalog && (
          <Link
            href={cartHref}
            className="ml-1 text-xs font-bold text-saffron-300 hover:text-saffron-200 underline underline-offset-2"
          >
            View
          </Link>
        )}
      </div>
    </div>
  );
}
