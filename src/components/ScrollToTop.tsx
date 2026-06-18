"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Force the window to scroll to top whenever the route changes.
 * Next.js usually handles this, but with force-dynamic pages and our
 * NavigationOverlay/cache interactions it sometimes lands at a stale scroll
 * position. This ensures every link click feels like a "fresh page".
 *
 * Skips when the URL has a hash (#section) so anchor links still work.
 */
export default function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return; // honor #anchor links
    // Use 'instant' so the user doesn't see a flicker of the previous page's bottom
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, searchParams]);

  return null;
}
