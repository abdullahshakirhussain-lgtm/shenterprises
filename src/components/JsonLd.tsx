/**
 * Renders schema.org JSON-LD inside a <script type="application/ld+json"> tag.
 * Google reads this for rich snippets (product price, stock, breadcrumb trails, etc.).
 *
 * Usage:
 *   <JsonLd data={productSchema(p, siteUrl)} />
 */

type Props = { data: object };

export default function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      // Dangerously OK here: we control the data shape, not user input
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ---------- Schema builders ----------

export function organizationSchema(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SH Enterprises",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description: "Craft and tailoring supplies in Sri Lanka — threads, zippers, scissors, ribbons, buttons, elastics and more. Island-wide delivery.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "LK",
      addressRegion: "Western Province",
    },
    sameAs: [
      // Add any social profiles here when ready
    ],
  };
}

export function websiteSchema(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SH Enterprises",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(
  siteUrl: string,
  crumbs: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${siteUrl}${c.url}`,
    })),
  };
}

export function productSchema(
  p: {
    name: string;
    slug: string;
    description?: string | null;
    sku?: string | null;
    price: number;
    salePrice?: number | null;
    imageUrl?: string | null;
    stock: number;
    category?: { name: string } | null;
  },
  siteUrl: string
) {
  const effectivePrice = p.salePrice && p.salePrice > 0 ? p.salePrice : p.price;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description || `${p.name} — available at SH Enterprises, Sri Lanka.`,
    sku: p.sku || undefined,
    image: p.imageUrl ? [p.imageUrl] : undefined,
    category: p.category?.name || undefined,
    brand: {
      "@type": "Brand",
      name: "SH Enterprises",
    },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/product/${p.slug}`,
      priceCurrency: "LKR",
      price: effectivePrice.toFixed(2),
      availability:
        p.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "SH Enterprises",
      },
    },
  };
}
