import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL || "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api",
          // Functional pages — no SEO value, don't compete with product pages
          "/cart",
          "/checkout",
          "/account",
          "/account/login",
          "/account/register",
          "/catalog",      // WhatsApp catalog — internal-use only
          "/ai-helper",    // Dynamic content, shouldn't show in search
          "/search",       // Search results pages
          "/track",        // Order tracking
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
