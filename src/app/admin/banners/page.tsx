import { prisma } from "@/lib/prisma";
import BannerEditor from "./BannerEditor";

export const dynamic = "force-dynamic";

export default async function AdminBanners() {
  const banners = await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl text-brand-900 mb-2">Home Page Banners</h1>
      <p className="text-sm text-brand-600 mb-6">
        These banners rotate in the hero slideshow on the home page (auto-rotates every 6 seconds).
        Upload wide images (e.g. 1920×800px) for best results. The "Shop now" and "View offers" buttons stay fixed on every slide.
      </p>
      <BannerEditor initial={banners} />
    </div>
  );
}
