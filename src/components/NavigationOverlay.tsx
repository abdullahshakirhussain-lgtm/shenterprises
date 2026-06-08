"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Shows a full-screen overlay between a link click and the new page rendering.
 * Auto-hides once the pathname or query params change (= new page is ready).
 * Listens to:
 *   - <a> link clicks (any internal link)
 *   - browser back/forward (popstate)
 *   - explicit "sh:nav" events you can dispatch from anywhere
 */
export default function NavigationOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Hide overlay whenever the route finishes changing
  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  // Show overlay on internal link clicks
  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Ignore modifier keys (open in new tab etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return; // only left click

      const link = (e.target as HTMLElement)?.closest?.("a");
      if (!link) return;
      if (link.target && link.target !== "_self") return;

      const href = link.getAttribute("href");
      if (!href) return;
      // Skip external, anchor, mailto, tel
      if (
        href.startsWith("http") ||
        href.startsWith("//") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) return;
      // Skip same-page links
      if (href === pathname) return;

      setLoading(true);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  // Show on browser back/forward
  useEffect(() => {
    function onPop() { setLoading(true); }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Manual trigger from anywhere: window.dispatchEvent(new Event("sh:nav"))
  useEffect(() => {
    function onNav() { setLoading(true); }
    window.addEventListener("sh:nav", onNav);
    return () => window.removeEventListener("sh:nav", onNav);
  }, []);

  // Failsafe — if loading state somehow gets stuck, auto-hide after 15s
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 15000);
    return () => clearTimeout(t);
  }, [loading]);

  if (!loading) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-cream/85 backdrop-blur-sm grid place-items-center"
      style={{ animation: "fadeIn 0.15s ease-out" }}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="text-5xl" style={{ animation: "spin 1.1s linear infinite" }}>🧵</div>
        <svg width="200" height="20" viewBox="0 0 200 20">
          <line x1="0" y1="10" x2="200" y2="10"
            stroke="rgb(var(--b600))" strokeWidth="3" strokeDasharray="9 9"
            style={{ animation: "sew 1s linear infinite" }} />
        </svg>
        <p className="font-serif text-brand-700 font-semibold text-sm tracking-wide">
          One moment…
        </p>
      </div>
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
