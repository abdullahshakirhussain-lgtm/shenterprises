"use client";
import { useEffect, useMemo, useState } from "react";
import { formatLKR } from "@/lib/utils";
import { pixelTrack } from "@/lib/pixel";

type Variant = {
  id: number;
  type: string;
  name: string;
  price: number | null;
  salePrice: number | null;
};

type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  stock: number;
  unitQty: number | null;
  unitType: string | null;
  variants: Variant[];
};

type Group = { name: string; slug: string; items: Product[] };

type CartLine = {
  key: string;
  productId: number;
  variantId: number | null;
  name: string;
  variantLabel: string | null;
  unitPrice: number;
  imageUrl: string | null;
  quantity: number;
};

const STORAGE_KEY = "sh_catalog_cart_v1";

export default function CatalogClient({ groups, shopPhone }: { groups: Group[]; shopPhone: string }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
    // Meta: catalog opened — a demand signal for the WhatsApp-first browse flow.
    // Include the catalog's product ids so this is a well-formed ViewContent
    // (content_ids + content_type present) rather than an identifier-less event
    // that Events Manager flags with "Update recommended".
    const catalogIds = groups.flatMap(g => g.items.map(p => `SHE-${p.id}`)).slice(0, 100);
    pixelTrack("ViewContent", {
      content_name: "QuickCatalog",
      content_category: "catalog",
      content_ids: catalogIds,
      content_type: "product",
      currency: "LKR",
    });
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch {}
  }, [cart]);

  // ---- Cart ops ----
  function add(line: Omit<CartLine, "quantity">) {
    setCart(prev => {
      const i = prev.findIndex(x => x.key === line.key);
      if (i >= 0) {
        return prev.map((x, idx) => idx === i ? { ...x, quantity: x.quantity + 1 } : x);
      }
      return [...prev, { ...line, quantity: 1 }];
    });
    // Fire toast event for global feedback
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sh:cart-added", {
        detail: { name: line.name, quantity: 1, imageUrl: line.imageUrl, cartHref: "#" }
      }));
    }
  }
  function setQty(key: string, qty: number) {
    setCart(prev => qty <= 0
      ? prev.filter(x => x.key !== key)
      : prev.map(x => x.key === key ? { ...x, quantity: qty } : x));
  }
  function clear() { setCart([]); }

  const totalQty = cart.reduce((s, l) => s + l.quantity, 0);
  const totalLkr = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  // Map of line-key -> qty for fast lookup in product rows
  const qtyByKey = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of cart) m.set(l.key, l.quantity);
    return m;
  }, [cart]);

  // ---- Search filter ----
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map(g => ({ ...g, items: g.items.filter(p => p.name.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0);
  }, [groups, search]);

  // ---- WhatsApp share ----
  function buildWhatsappText(): string {
    const lines: string[] = [];
    lines.push("🧵 *SH Enterprises order request*");
    lines.push("");
    for (const l of cart) {
      const label = l.variantLabel ? ` (${l.variantLabel})` : "";
      lines.push(`• ${l.name}${label} × ${l.quantity} — ${formatLKR(l.unitPrice * l.quantity)}`);
    }
    lines.push("");
    lines.push(`*Total:* ${formatLKR(totalLkr)}`);
    lines.push("");
    lines.push("(Sent from the quick catalog. Please confirm colors & delivery address.)");
    return lines.join("\n");
  }

  function sendToWhatsApp() {
    if (cart.length === 0) return;
    // Meta: the critical on-site -> off-site handoff. Orders close on WhatsApp,
    // so this Lead (ContactWhatsApp) is our primary conversion-intent signal.
    pixelTrack("Lead", {
      content_name: "ContactWhatsApp",
      source: "catalog",
      value: totalLkr,
      currency: "LKR",
      num_items: cart.reduce((s, l) => s + l.quantity, 0),
      content_ids: cart.map(l => l.variantId ? `SHE-${l.productId}-${l.variantId}` : `SHE-${l.productId}`),
      content_type: "product",
    });
    // Owned analytics — same fire point, parallel log.
    fetch("/api/analytics", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "whatsapp_click",
        value: totalLkr,
        meta: { source: "catalog", items: cart.map(l => ({ id: l.productId, qty: l.quantity })) },
      }),
    }).catch(() => {});
    const text = encodeURIComponent(buildWhatsappText());
    const url = shopPhone
      ? `https://wa.me/${shopPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  }

  return (
    <div className="min-h-screen bg-cream/50">
      {/* Self-contained catalog header — replaces the hidden site header */}
      <div className="sticky top-0 z-20 bg-white border-b border-saffron-200/40 shadow-sm">
        <div className="container-x py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-semibold text-lg text-ink leading-tight">Quick catalog</h1>
            <p className="text-[11px] text-ink-mute leading-tight">Tap + to add — share your list on WhatsApp</p>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="relative rounded-xl bg-ink text-cream px-4 py-2 text-sm font-bold shrink-0 hover:bg-ink-soft transition-colors"
          >
            View cart
            {totalQty > 0 && (
              <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-saffron-500 text-white text-xs font-bold ring-2 ring-white">
                {totalQty}
              </span>
            )}
          </button>
        </div>
        <div className="container-x pb-3">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full px-3 py-2 rounded-lg border border-brand-200 bg-cream/40 text-sm focus:outline-none focus:border-saffron-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Product list */}
      <div className="container-x py-5 pb-32 space-y-7">
        {filteredGroups.length === 0 && (
          <p className="text-center text-ink-mute py-10 italic">No products match.</p>
        )}
        {filteredGroups.map(g => (
          <section key={g.slug}>
            <h2 className="font-display font-semibold text-base text-saffron-700 uppercase tracking-[.15em] mb-2 pb-1 border-b border-saffron-200/50">
              {g.name}
            </h2>
            <ul className="space-y-1">
              {g.items.map(p => (
                <ProductRow
                  key={p.id}
                  product={p}
                  qtyByKey={qtyByKey}
                  onAdd={add}
                  onSetQty={setQty}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Floating Share button — always reachable from anywhere; opens cart drawer first */}
      {totalQty > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebd5b] text-white font-bold px-5 py-3.5 rounded-full shadow-2xl transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.299-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
          Review &amp; share · {formatLKR(totalLkr)}
        </button>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={() => setShowCart(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-saffron-200/40 flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-lg text-ink">Review your list</h2>
                <p className="text-[11px] text-ink-mute">{totalQty} item{totalQty === 1 ? "" : "s"} · check before sending</p>
              </div>
              <button onClick={() => setShowCart(false)} className="text-ink-mute hover:text-ink text-2xl leading-none">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {cart.length === 0 ? (
                <p className="text-center text-ink-mute italic py-10">Nothing added yet.</p>
              ) : cart.map(l => (
                <div key={l.key} className="flex items-center gap-3 p-2 bg-cream/40 rounded-lg">
                  {l.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.imageUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-brand-50 grid place-items-center text-lg shrink-0">🧵</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-sm text-ink truncate">{l.name}</p>
                    {l.variantLabel && <p className="text-xs text-saffron-700">{l.variantLabel}</p>}
                    <p className="text-xs text-ink-mute">{formatLKR(l.unitPrice)} each</p>
                  </div>
                  <div className="inline-flex items-center border border-brand-200 rounded-lg overflow-hidden shrink-0">
                    <button onClick={() => setQty(l.key, l.quantity - 1)} className="w-8 h-8 text-lg font-bold text-brand-700 hover:bg-brand-50">−</button>
                    <span className="w-10 text-center font-semibold text-sm">{l.quantity}</span>
                    <button onClick={() => setQty(l.key, l.quantity + 1)} className="w-8 h-8 text-lg font-bold text-brand-700 hover:bg-brand-50">+</button>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-saffron-700 w-20 text-right">
                    {formatLKR(l.unitPrice * l.quantity)}
                  </span>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="px-5 py-4 border-t border-saffron-200/40 bg-ivory/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-mute">Total</span>
                  <span className="font-display text-xl font-bold text-ink">{formatLKR(totalLkr)}</span>
                </div>
                <button
                  onClick={sendToWhatsApp}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebd5b] text-white font-bold py-3 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.607z"/>
                  </svg>
                  Send list to WhatsApp
                </button>
                <button onClick={clear} className="w-full text-xs text-ink-mute hover:text-ink underline">
                  Clear list
                </button>
                <p className="text-[10px] text-ink-mute text-center italic">
                  WhatsApp will open with your order pre-filled. You can add color preferences and delivery details in chat.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- One product row (renders one row OR one row per variant) ----------
function ProductRow({
  product,
  qtyByKey,
  onAdd,
  onSetQty,
}: {
  product: Product;
  qtyByKey: Map<string, number>;
  onAdd: (l: Omit<CartLine, "quantity">) => void;
  onSetQty: (key: string, qty: number) => void;
}) {
  const packs = product.variants.filter(v => v.type === "pack");
  const sizes = product.variants.filter(v => v.type === "size");

  function variantEffective(v: Variant): number | null {
    if (v.salePrice != null && v.salePrice > 0) return v.salePrice;
    if (v.price != null && v.price > 0) return v.price;
    return null;
  }

  const basePrice = (product.salePrice ?? product.price) > 0 ? (product.salePrice ?? product.price) : null;
  const unitLabel = product.unitQty && product.unitType ? `${product.unitQty} ${product.unitType}` : null;

  if (packs.length === 0 && sizes.length === 0) {
    if (basePrice == null) return null;
    const key = `${product.id}`;
    return (
      <Row
        imageUrl={product.imageUrl}
        title={product.name}
        subtitle={unitLabel}
        price={basePrice}
        qty={qtyByKey.get(key) || 0}
        onAdd={() => onAdd({
          key,
          productId: product.id,
          variantId: null,
          name: product.name,
          variantLabel: unitLabel,
          unitPrice: basePrice,
          imageUrl: product.imageUrl,
        })}
        onInc={() => onSetQty(key, (qtyByKey.get(key) || 0) + 1)}
        onDec={() => onSetQty(key, (qtyByKey.get(key) || 0) - 1)}
      />
    );
  }

  const variants = [...packs, ...sizes];
  return (
    <>
      {variants.map(v => {
        const vp = variantEffective(v) ?? basePrice;
        if (vp == null) return null;
        const label = `${v.type === "pack" ? "Pack" : "Size"}: ${v.name}`;
        const key = `${product.id}-${v.id}`;
        return (
          <Row
            key={v.id}
            imageUrl={product.imageUrl}
            title={product.name}
            subtitle={label}
            price={vp}
            qty={qtyByKey.get(key) || 0}
            onAdd={() => onAdd({
              key,
              productId: product.id,
              variantId: v.id,
              name: product.name,
              variantLabel: label,
              unitPrice: vp,
              imageUrl: product.imageUrl,
            })}
            onInc={() => onSetQty(key, (qtyByKey.get(key) || 0) + 1)}
            onDec={() => onSetQty(key, (qtyByKey.get(key) || 0) - 1)}
          />
        );
      })}
    </>
  );
}

function Row({
  imageUrl, title, subtitle, price, qty, onAdd, onInc, onDec,
}: {
  imageUrl: string | null;
  title: string;
  subtitle: string | null;
  price: number;
  qty: number;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <li className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${qty > 0 ? "bg-saffron-50/60" : "hover:bg-saffron-50"}`}>
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-brand-50 overflow-hidden shrink-0">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-xl">🧵</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-ink truncate">{title}</p>
        {subtitle && <p className="text-xs text-ink-mute truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-bold text-saffron-700 w-20 text-right">{formatLKR(price)}</span>
        {qty > 0 ? (
          <div className="inline-flex items-center bg-ink rounded-full overflow-hidden shadow-md">
            <button onClick={onDec} className="w-8 h-8 grid place-items-center text-cream text-lg font-bold hover:bg-ink-soft transition-colors" aria-label="Decrease">−</button>
            <span className="w-7 text-center text-cream font-bold text-sm tabular-nums">{qty}</span>
            <button onClick={onInc} className="w-8 h-8 grid place-items-center text-cream text-lg font-bold hover:bg-ink-soft transition-colors" aria-label="Increase">+</button>
          </div>
        ) : (
          <button
            onClick={onAdd}
            className="w-8 h-8 grid place-items-center rounded-full bg-ink text-cream text-base font-bold hover:bg-ink-soft transition-colors"
            aria-label="Add"
          >
            +
          </button>
        )}
      </div>
    </li>
  );
}
