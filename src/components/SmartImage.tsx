"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
type Props = { src: string | null | undefined; alt: string; sizes: string; className?: string; fit?: "cover" | "contain"; priority?: boolean };

// Images mounted after the first hydration (client navigation, pagination, load
// more) start hidden and fade in once *their own* file has loaded, over a
// shimmer placeholder. Server-rendered images are never hidden, so first paint
// never waits on JavaScript.
let hydrated = false;

export default function SmartImage(props: Props) {
  // key={src}: a new product always gets a brand-new <img>, so the browser can
  // never keep painting the previous product's photo while the new one loads.
  return props.src ? <SourceImage key={props.src} {...props} src={props.src} /> : null;
}
function SourceImage({ src, alt, sizes, className = "", fit = "cover", priority = false }: Props & { src: string }) {
 const external = /^https?:\/\//i.test(src);
 const allowed = !external || (process.env.NEXT_PUBLIC_IMAGE_HOSTS || "").split(",").includes(new URL(src).hostname);
 const [fallback, setFallback] = useState(!allowed);
 const [failed, setFailed] = useState(false);
 const [hideUntilLoaded] = useState(() => hydrated);
 const [loaded, setLoaded] = useState(false);
 useEffect(() => { hydrated = true; }, []);
 if (failed) return <span role="img" aria-label={alt} className="absolute inset-0 grid place-items-center bg-brand-50 text-brand-500 text-xs p-2">Image unavailable</span>;
 return <>
   {!loaded && <span aria-hidden className="img-skeleton absolute inset-0" />}
   <Image src={src} alt={alt} fill sizes={sizes} priority={priority}
     unoptimized={fallback}
     onLoad={() => setLoaded(true)}
     onError={() => fallback ? setFailed(true) : setFallback(true)}
     // Inline style (not a class) so callers' own opacity classes still apply once loaded.
     style={hideUntilLoaded && !loaded ? { opacity: 0 } : undefined}
     className={(fit === "contain" ? "object-contain " : "object-cover ") +
       (hideUntilLoaded ? "transition-opacity duration-200 " : "") + className} />
 </>;
}
