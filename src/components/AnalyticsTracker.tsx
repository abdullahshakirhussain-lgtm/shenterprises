"use client";
import { isPrivatePath, cleanTrackingPath } from "@/lib/trackingPaths";
import { browserSession } from "@/lib/browserSession";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const lastPing = useRef<number>(Date.now());

  // Page view
  useEffect(() => {
    if (isPrivatePath(pathname)) return;
    const path = pathname + (sp.toString() ? `?${sp.toString()}` : "");
    browserSession();
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "page_view", path: cleanTrackingPath(path), referrer: document.referrer })
    }).catch(() => {});
    lastPing.current = Date.now();
  }, [pathname, sp]);

  // Heartbeat for time-on-site (every 20s while tab visible)
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible" || isPrivatePath(window.location.pathname)) return;
      const now = Date.now();
      const dt = now - lastPing.current;
      lastPing.current = now;
      if (dt > 0 && dt < 60000) {
        browserSession();
    fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "ping", value: dt })
        }).catch(() => {});
      }
    };
    const id = setInterval(tick, 20000);
    const onHide = () => tick();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onHide);
    };
  }, []);

  return null;
}
