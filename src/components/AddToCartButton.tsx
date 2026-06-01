"use client";
import { useState } from "react";
import { useCart } from "./CartProvider";

export default function AddToCartButton({
  product,
  disabled,
  small
}: {
  product: { id: number; name: string; slug: string; price: number; imageUrl?: string | null };
  disabled?: boolean;
  small?: boolean;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  return (
    <button
      disabled={disabled}
      onClick={() => {
        add({ productId: product.id, name: product.name, slug: product.slug, price: product.price, imageUrl: product.imageUrl ?? null });
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
      }}
      className={`btn-primary mt-2 w-full ${small ? "text-xs py-1.5" : ""} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {added ? "✓ Added" : "Add to cart"}
    </button>
  );
}
