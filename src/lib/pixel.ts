/**
 * Meta (Facebook) Pixel helpers.
 * Safe no-ops when the pixel isn't loaded (no ID configured, ad-blocker, SSR).
 * The pixel ID is public by design — it lives in NEXT_PUBLIC_META_PIXEL_ID.
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

export const META_PIXEL_ID =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_META_PIXEL_ID || "" : "";

/** Fire a standard Meta pixel event. Silently ignored if fbq isn't present. */
export function pixelTrack(event: string, params?: Record<string, any>) {
  if (typeof window === "undefined") return;
  if (typeof window.fbq !== "function") return;
  try {
    window.fbq("track", event, params || {});
  } catch {
    /* never let analytics break the app */
  }
}
