"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { pixelTrack } from "@/lib/pixel";
import { contentId } from "@/lib/contentId";

export type CartVariant = { type: "color" | "size" | "length" | "pack"; name: string; id: number };

export type CartItem = {
  key: string;            // unique line key = productId + sorted variant ids
  productId: number;
  sku?: string | null;    // for canonical Meta/Google content id
  name: string;
  slug: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;
  variants?: CartVariant[];   // selected variants for this line
};

type Ctx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "quantity" | "key">, qty?: number) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "sh_cart_v2";

function makeKey(productId: number, variants?: CartVariant[]) {
  if (!variants || variants.length === 0) return `${productId}`;
  const ids = variants.map(v => v.id).sort().join("-");
  return `${productId}::${ids}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
      // Clear the old v1 cart key so stale items don't linger
      localStorage.removeItem("sh_cart_v1");
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    fetch("/api/cart-snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, total: subtotal })
    }).catch(() => {});
  }, [items, hydrated]);

  const add = useCallback((item: Omit<CartItem, "quantity" | "key">, qty = 1) => {
    setItems((prev) => {
      const key = makeKey(item.productId, item.variants);
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, { ...item, key, quantity: qty }];
    });
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "add_to_cart", productId: item.productId, quantity: qty, value: item.price * qty })
    }).catch(() => {});

    // Meta Pixel — AddToCart conversion event (deduped browser + CAPI)
    pixelTrack("AddToCart", {
      content_name: item.name,
      content_ids: [contentId({ sku: item.sku, id: item.productId })],
      content_type: "product",
      value: item.price * qty,
      currency: "LKR",
    });

    // Fire a window event so the global CartToast can show reassurance feedback
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sh:cart-added", {
        detail: { name: item.name, quantity: qty, imageUrl: item.imageUrl }
      }));
    }
  }, []);

  const remove = useCallback((key: string) => {
    setItems((prev) => {
      const it = prev.find(i => i.key === key);
      if (it) {
        fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "remove_from_cart", productId: it.productId })
        }).catch(() => {});
      }
      return prev.filter((i) => i.key !== key);
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, quantity: qty } : i))
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, count, subtotal, add, remove, setQty, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
