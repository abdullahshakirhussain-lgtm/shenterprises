"use client";
import Script from "next/script";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureFbclid, pixelTrack } from "@/lib/pixel";

/**
 * Loads the Meta Pixel base code, captures fbclid -> _fbc on landing, and fires
 * a deduplicated PageView (browser + server CAPI) on every client-side route
 * change.
 *
 * The pixel id is passed as a prop from the root layout, which reads it from a
 * RUNTIME env var (process.env.META_PIXEL_ID / NEXT_PUBLIC_META_PIXEL_ID). This
 * avoids the NEXT_PUBLIC build-time inlining trap on Railway — if the var wasn't
 * present when `next build` ran, an inlined constant would be empty forever, but
 * a runtime read is always current. The id is also seeded to window (by the
 * layout, synchronously) so pixelTrack() in other components can read it.
 *
 * Renders nothing when no id is configured.
 */
export default function MetaPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => { captureFbclid(); }, []);

  useEffect(() => {
    if (!pixelId) return;
    // Deduplicated PageView (browser pixel + server CAPI share one event_id).
    pixelTrack("PageView");
  }, [pathname, searchParams, pixelId]);

  if (!pixelId) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        // PageView is fired by the React effect (deduped browser+CAPI),
        // not here, so the landing page isn't counted twice.
      `}
    </Script>
  );
}
