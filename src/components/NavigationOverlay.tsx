"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Shows a full-screen overlay between a link click and the new page rendering.
 * Auto-hides once the pathname or query params change (= new page is ready).
 *
 * Smarter than a naive overlay:
 *  - Only shows after a small delay (250ms) so instant navigations don't flash
 *  - Auto-hides on any sign of new content (pathname change, body click, etc.)
 *  - Hard failsafe at 5s — never sticks
 *  - Does NOT show on browser back/forward (Next.js router cache makes these instant)
 */
export default function NavigationOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const showTimer = useRef<any>(null);
  const isBack = useRef(false);

  const clearShowTimer = useCallback(() => {
    if (showTimer.current) { clearTimeout(showTimer.current); showTimer.current = null; }
  }, []);

  const startLoading = useCallback(() => {
    clearShowTimer();
    // Don't show overlay immediately — wait 250ms so quick nav doesn't flash
    showTimer.current = setTimeout(() => setLoading(true), 250);
  }, [clearShowTimer]);

  const stopLoading = useCallback(() => {
    clearShowTimer();
    setLoading(false);
  }, [clearShowTimer]);

  // Whenever route changes, the new page is rendering → hide overlay
  useEffect(() => {
    stopLoading();
    isBack.current = false;
  }, [pathname, searchParams, stopLoading]);

  // Internal link clicks
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;

      const link = (e.target as HTMLElement)?.closest?.("a");
      if (!link) return;
      if (link.target && link.target !== "_self") return;

      const href = link.getAttribute("href");
      if (!href) return;
      if (
        href.startsWith("http") ||
        href.startsWith("//") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) return;
      if (href === pathname) return;

      startLoading();
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname, startLoading]);

  // Browser back/forward — mark it so we can decide not to show overlay
  // (Next.js's router cache makes these usually instant)
  useEffect(() => {
    function onPop() {
      isBack.current = true;
      // Don't show overlay for back/forward — should be instant from cache
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Manual trigger from anywhere: window.dispatchEvent(new Event("sh:nav"))
  useEffect(() => {
    function onNav() { startLoading(); }
    window.addEventListener("sh:nav", onNav);
    return () => window.removeEventListener("sh:nav", onNav);
  }, [startLoading]);

  // Hard failsafe — never let overlay stick more than 5s
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(t);
  }, [loading, stopLoading]);

  // Also: any user input (key/click) after overlay shows → assume page is ready, hide
  useEffect(() => {
    if (!loading) return;
    function dismissOnInteraction() { stopLoading(); }
    window.addEventListener("keydown", dismissOnInteraction);
    window.addEventListener("pointerdown", dismissOnInteraction);
    return () => {
      window.removeEventListener("keydown", dismissOnInteraction);
      window.removeEventListener("pointerdown", dismissOnInteraction);
    };
  }, [loading, stopLoading]);

  if (!loading) return null;

  return (
    <div
      className="pointer-events-none fixed top-0 left-0 right-0 z-[200] h-1 bg-saffron-500 animate-pulse motion-reduce:animate-none"
      style={{ animation: "fadeIn 0.15s ease-out" }}
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading page</span>
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
