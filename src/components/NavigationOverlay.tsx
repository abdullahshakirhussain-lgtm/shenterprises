"use client";
import { useEffect, useState, useRef } from "react";
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

  function clearShowTimer() {
    if (showTimer.current) { clearTimeout(showTimer.current); showTimer.current = null; }
  }

  function startLoading() {
    clearShowTimer();
    // Don't show overlay immediately — wait 250ms so quick nav doesn't flash
    showTimer.current = setTimeout(() => setLoading(true), 250);
  }

  function stopLoading() {
    clearShowTimer();
    setLoading(false);
  }

  // Whenever route changes, the new page is rendering → hide overlay
  useEffect(() => {
    stopLoading();
    isBack.current = false;
  }, [pathname, searchParams]);

  // Internal link clicks
  useEffect(() => {
    function onClick(e: MouseEvent) {
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
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

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
  }, []);

  // Hard failsafe — never let overlay stick more than 5s
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(t);
  }, [loading]);

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
