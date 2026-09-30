"use client";
import Image from "next/image";
import { useState } from "react";
type Props = { src: string | null | undefined; alt: string; sizes: string; className?: string; fit?: "cover" | "contain"; priority?: boolean };
export default function SmartImage(props: Props) {
 return props.src ? <SourceImage key={props.src} {...props} src={props.src} /> : null;
}
function SourceImage({ src, alt, sizes, className = "", fit = "cover", priority = false }: Props & { src: string }) {
 const external = /^https?:\/\//i.test(src);
 const allowed = !external || (process.env.NEXT_PUBLIC_IMAGE_HOSTS || "").split(",").includes(new URL(src).hostname);
 const [fallback, setFallback] = useState(!allowed);
 const [failed, setFailed] = useState(false);
 if (failed) return <span role="img" aria-label={alt} className="absolute inset-0 grid place-items-center bg-brand-50 text-brand-500 text-xs p-2">Image unavailable</span>;
 return <Image src={src} alt={alt} fill sizes={sizes} priority={priority}
   unoptimized={fallback}
   onError={() => fallback ? setFailed(true) : setFallback(true)}
   className={(fit === "contain" ? "object-contain " : "object-cover ") + className} />;
}
