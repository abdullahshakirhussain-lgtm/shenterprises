import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL || "https://shenterprises.lk";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api",
          // Functional pages — no SEO value, don't compete with product pages
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
