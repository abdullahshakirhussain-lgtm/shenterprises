import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// Generate the sitemap at request time, not at build time.
// Otherwise prerendering 66 pages concurrently exhausts the Supabase pooler's 15-connection limit.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL || "http://localhost:3000";
  const [products, categories, machines] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.machine.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } })
  ]);
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/offers`, priority: 0.8 },
    { url: `${base}/machines`, priority: 0.8 },
    ...categories.map((c) => ({ url: `${base}/category/${c.slug}`, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updatedAt, priority: 0.6 })),
    ...machines.map((m) => ({ url: `${base}/machines/${m.slug}`, lastModified: m.updatedAt, priority: 0.7 }))
  ];
}
