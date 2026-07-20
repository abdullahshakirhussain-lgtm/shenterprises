import Image from "next/image";

/**
 * Thin wrapper over next/image for customer-facing images.
 *
 * Uses `fill`, so the PARENT must be positioned (relative/absolute) with a
 * defined size — our image tiles are already `relative aspect-* overflow-hidden`.
 *
 * Why this exists: the whole site rendered plain <img> tags, which downloaded
 * full-size (multi-MB) originals for every thumbnail, never lazy-loaded, and
 * reused DOM nodes across renders (so a card briefly showed the previous
 * product's photo). next/image resizes to the displayed size, serves WebP/AVIF,
 * lazy-loads offscreen images, and binds each image to its own src — fixing
 * both the slowness and the "wrong photo until it loads" swap.
 *
 * Returns null on empty src so callers keep their own placeholder branch.
 */
export default function SmartImage({
  src,
  alt,
  sizes,
  className = "",
  fit = "cover",
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  /** Responsive hint so the optimizer picks the right width. Required for good results. */
  sizes: string;
  className?: string;
  fit?: "cover" | "contain";
  /** Set true for above-the-fold hero images so they aren't lazy-loaded. */
  priority?: boolean;
}) {
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`${fit === "contain" ? "object-contain" : "object-cover"} ${className}`}
    />
  );
}
