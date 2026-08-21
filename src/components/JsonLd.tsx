/**
 * Renders schema.org JSON-LD inside a <script type="application/ld+json"> tag.
 * Google reads this for rich snippets (product price, stock, breadcrumb trails, etc.).
 *
 * Usage:
 *   <JsonLd data={productSchema(p, siteUrl)} />
 */

type Props = { data: object };

/**
 * Serialize JSON for safe embedding inside a <script> tag.
 * JSON.stringify does NOT escape "<", so a value containing "</script>" could
 * break out of the tag and execute. Escaping the angle brackets and ampersand
 * fully prevents the breakout — this is the actual XSS guard.
 */
export function safeJsonLd(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export default function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
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
    sameAs: [],
  };
}

/**
 * LocalBusiness (Store) — the physical Colombo shop. Feeds "sewing/craft
 * supplies in Colombo / Sri Lanka" answers in Google and AI search engines,
 * which lean on NAP (name/address/phone), hours and area served. Geo lat/lng is
 * intentionally omitted so the postal address (authoritative, geocodable) drives
 * the map pin rather than a guessed coordinate.
 */
export function localBusinessSchema(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${siteUrl}/#store`,
    name: "SH Enterprises",
    url: siteUrl,
    image: `${siteUrl}/logo.png`,
    logo: `${siteUrl}/logo.png`,
    description:
      "Craft, tailoring & industrial sewing supplies in Colombo, Sri Lanka — threads, zippers, buttons, elastics, trims, and industrial sewing machines. Island-wide delivery.",
    telephone: "+94779792906",
    priceRange: "$$",
    currenciesAccepted: "LKR",
    paymentAccepted: "Cash on delivery, Bank deposit",
    address: {
      "@type": "PostalAddress",
      streetAddress: "218 2/6, 2nd Cross Street",
      addressLocality: "Colombo 11",
      addressRegion: "Western Province",
      postalCode: "01100",
      addressCountry: "LK",
    },
    areaServed: { "@type": "Country", name: "Sri Lanka" },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00",
        closes: "18:00",
      },
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
    outOfStock?: boolean;
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
      availability: p.outOfStock
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "SH Enterprises",
      },
    },
  };
}
