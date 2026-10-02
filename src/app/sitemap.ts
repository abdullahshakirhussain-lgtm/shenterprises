import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { memo } from "@/lib/memo";
import { langPath } from "@/lib/seoLang";

// Generate the sitemap at request time, not at build time.
// Otherwise prerendering 66 pages concurrently exhausts the Supabase pooler's 15-connection limit.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL || "https://shenterprises.lk";
  const [products, categories, machines, machineTypes] = await memo("sitemap", () => Promise.all([
    prisma.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.machine.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
    prisma.machineType.findMany({ select: { slug: true, updatedAt: true } })
  ]));
  // Shop pages exist in English, Sinhala (/si) and Tamil (/ta): list every version,
  // each pointing at the other two (hreflang) — matches lib/seoLang.ts.
  const localized = (path: string, priority: number, lastModified?: Date): MetadataRoute.Sitemap => {
    const languages = { "en-LK": base + path, "si-LK": base + langPath(path, "si"), "ta-LK": base + langPath(path, "ta") };
    return (["en", "si", "ta"] as const).map(l => ({ url: base + langPath(path, l), priority: l === "en" ? priority : priority * 0.8, lastModified, alternates: { languages } }));
  };
  return [
    ...localized("/", 1),
    ...localized("/shop", 0.8),
    ...localized("/offers", 0.8),
    { url: `${base}/machines`, priority: 0.8 },
    ...["delivery", "privacy", "terms"].map(p => ({ url: `${base}/${p}`, priority: 0.3 })),
    ...categories.flatMap((c) => localized(`/category/${c.slug}`, 0.7)),
    ...products.flatMap((p) => localized(`/product/${p.slug}`, 0.6, p.updatedAt)),
    // Type hubs are the head-term SEO pages — highest machine priority
    ...machineTypes.map((t) => ({ url: `${base}/machines/${t.slug}`, lastModified: t.updatedAt, priority: 0.8 })),
    ...machines.map((m) => ({ url: `${base}/machines/${m.slug}`, lastModified: m.updatedAt, priority: 0.7 }))
  ];
}
