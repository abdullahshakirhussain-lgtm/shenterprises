"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureFbclid, pixelTrack } from "@/lib/pixel";
import { isPrivatePath } from "@/lib/trackingPaths";
export default function MetaPixel({ pixelId }: { pixelId: string }) {
 const pathname = usePathname();
 const searchParams = useSearchParams();
 useEffect(() => {
 if (!pixelId || isPrivatePath(pathname)) return;
 captureFbclid();
 pixelTrack("PageView");
 }, [pathname, searchParams, pixelId]);
 return null;
}
