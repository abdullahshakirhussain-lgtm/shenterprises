"use client";
import Script from "next/script";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { META_PIXEL_ID, captureFbclid, pixelTrack } from "@/lib/pixel";

/**
 * Loads the Meta Pixel base code, captures fbclid -> _fbc on landing, and fires
 * a deduplicated PageView (browser + server CAPI) on every client-side route
 * change. Next.js SPA navigation doesn't reload the page, so the base PageView
 * alone would miss subsequent views.
 *
 * Renders nothing and loads nothing when NEXT_PUBLIC_META_PIXEL_ID is unset.
 */
export default function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Capture the click id once as early as possible
  useEffect(() => { captureFbclid(); }, []);

  useEffect(() => {
    if (!META_PIXEL_ID) return;
    // Deduplicated PageView (browser pixel + server CAPI share one event_id).
    // The base script also fires an initial PageView; that first one is browser
    // only (no matching server twin) which Meta tolerates. Subsequent SPA
    // navigations are the deduped ones.
    pixelTrack("PageView");
  }, [pathname, searchParams]);

  if (!META_PIXEL_ID) return null;

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
        fbq('init', '${META_PIXEL_ID}');
        // NOTE: PageView is fired by the React effect (deduped browser+CAPI),
        // not here, so the landing page isn't counted twice.
      `}
    </Script>
  );
}
