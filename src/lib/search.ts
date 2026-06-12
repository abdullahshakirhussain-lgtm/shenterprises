import { prisma } from "./prisma";
import { getSetting } from "./settings";
import { translateQueryToEnglish } from "./translate";

export type SearchProduct = {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  onOffer: boolean;
  stock: number;
  unitQty: number | null;
  unitType: string | null;
};

/**
 * Expand a token using the admin-managed synonyms map.
 * Format in Settings: {"thred":"thread","zip":"zipper","sissor":"scissor"}
 */
function expandToken(token: string, synonyms: Record<string, string>): string[] {
  const out = new Set<string>([token]);
  const lc = token.toLowerCase();
  // Direct lookup: "thred" → "thread"
  if (synonyms[lc]) out.add(synonyms[lc]);
  // Reverse lookup: searching "thread" should also include all synonyms that map TO "thread"
  for (const [misspelling, canonical] of Object.entries(synonyms)) {
    if (canonical.toLowerCase() === lc) out.add(misspelling);
  }
  return [...out];
}

async function getSynonyms(): Promise<Record<string, string>> {
  const raw = await getSetting("search_synonyms");
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {}
  return {};
}

/**
 * Smart product search.
 * 1. Tokenize the query, lowercase
 * 2. Expand each token via synonyms map
 * 3. AND across tokens, OR within token-variants
 * 4. If no results and query >= 4 chars → fuzzy fallback via pg_trgm (if enabled)
 */
export async function smartSearch(q: string, limit = 60): Promise<SearchProduct[]> {
  // Multilingual: if the query contains non-ASCII characters (Sinhala/Tamil/etc.),
  // translate it to English first so it matches the English product DB.
  const englishQuery = await translateQueryToEnglish(q);

  const tokens = englishQuery.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const synonyms = await getSynonyms();
  const expandedTokens = tokens.map(t => expandToken(t, synonyms));

  // Build AND of (OR of synonyms) where each variant matches name/desc/sku/category
  const where: any = {
    active: true,
    AND: expandedTokens.map(variants => ({
      OR: variants.flatMap(v => ([
        { name:        { contains: v, mode: "insensitive" as const } },
        { description: { contains: v, mode: "insensitive" as const } },
        { sku:         { contains: v, mode: "insensitive" as const } },
        { category:    { name: { contains: v, mode: "insensitive" as const } } },
      ]))
    }))
  };

  const exact = await prisma.product.findMany({
    where,
    take: limit,
    orderBy: [
      { featured: "desc" },
      { onOffer: "desc" },
      { stock: "desc" },
    ],
    select: searchSelect,
  });

  if (exact.length > 0 || q.length < 4) return exact;

  // Fuzzy fallback — only kicks in if exact found nothing and query is long enough
  return await fuzzySearch(q, limit);
}

/**
 * Fuzzy search using PostgreSQL pg_trgm.
 * If the extension isn't enabled, this throws and we silently return [].
 *
 * To enable on Supabase, run once in SQL Editor:
 *   CREATE EXTENSION IF NOT EXISTS pg_trgm;
 *   CREATE INDEX IF NOT EXISTS product_name_trgm_idx ON "Product" USING gin (name gin_trgm_ops);
 */
async function fuzzySearch(q: string, limit: number): Promise<SearchProduct[]> {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT id, name, slug, price, "salePrice", "imageUrl", "onOffer", stock, "unitQty", "unitType",
             similarity(name, $1) AS sim
      FROM "Product"
      WHERE active = true AND similarity(name, $1) > 0.25
      ORDER BY sim DESC, featured DESC, "onOffer" DESC
      LIMIT $2
    `, q, limit);
    return rows.map(r => ({
      id: r.id, name: r.name, slug: r.slug, price: Number(r.price),
      salePrice: r.salePrice == null ? null : Number(r.salePrice),
      imageUrl: r.imageUrl, onOffer: r.onOffer, stock: r.stock,
      unitQty: r.unitQty, unitType: r.unitType,
    }));
  } catch {
    return [];
  }
}

const searchSelect = {
  id: true, name: true, slug: true, price: true, salePrice: true,
  imageUrl: true, onOffer: true, stock: true, unitQty: true, unitType: true,
};
