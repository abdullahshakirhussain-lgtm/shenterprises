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

function expandToken(token: string, synonyms: Record<string, string>): string[] {
  const out = new Set<string>([token]);
  const lc = token.toLowerCase();
  if (synonyms[lc]) out.add(synonyms[lc]);
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
 * Score how well a product matches the query tokens.
 * Higher = more relevant. The location of the match is what matters most:
 * a "thread" in the product NAME outranks "thread" mentioned in some description.
 */
function scoreProduct(
  product: {
    name: string; description: string | null; sku: string | null; stock: number;
    featured: boolean; onOffer: boolean;
    category: { name: string } | null;
  },
  tokenVariants: string[][]
): number {
  let score = 0;
  const nameLc = product.name.toLowerCase();
  const descLc = (product.description || "").toLowerCase();
  const skuLc = (product.sku || "").toLowerCase();
  const catLc = (product.category?.name || "").toLowerCase();

  for (const variants of tokenVariants) {
    // For this token group, pick the highest-scoring location across its synonyms
    let bestForToken = 0;
    for (const v of variants) {
      const vLc = v.toLowerCase();
      if (!vLc) continue;
      let tokenScore = 0;
      if (nameLc === vLc) tokenScore = Math.max(tokenScore, 100);
      else if (nameLc.startsWith(vLc + " ") || nameLc.startsWith(vLc + "-")) tokenScore = Math.max(tokenScore, 80);
      else if (new RegExp(`\\b${escapeRegex(vLc)}\\b`).test(nameLc)) tokenScore = Math.max(tokenScore, 65);
      else if (nameLc.includes(vLc)) tokenScore = Math.max(tokenScore, 50);
      else if (catLc === vLc) tokenScore = Math.max(tokenScore, 40);
      else if (catLc.includes(vLc)) tokenScore = Math.max(tokenScore, 35);
      else if (skuLc.includes(vLc)) tokenScore = Math.max(tokenScore, 25);
      else if (descLc.includes(vLc)) tokenScore = Math.max(tokenScore, 10);
      bestForToken = Math.max(bestForToken, tokenScore);
    }
    // Sum across token groups so multi-word queries with strong matches dominate
    score += bestForToken;
  }

  // Small bonuses — never enough to flip relevance, just break ties
  if (product.featured) score += 5;
  if (product.onOffer) score += 3;
  if (product.stock > 0) score += 1;
  if (product.stock <= 0) score -= 2;

  return score;
}

function escapeRegex(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/**
 * Smart product search with relevance scoring.
 *  1. Translate non-English → English
 *  2. Expand synonyms
 *  3. SQL: cast a wide net (any token in name/desc/sku/category)
 *  4. JS: score every match by WHERE the hit happened
 *  5. Sort by score; fall back to fuzzy if zero hits
 */
export async function smartSearch(q: string, limit = 60): Promise<SearchProduct[]> {
  const englishQuery = await translateQueryToEnglish(q);

  const tokens = englishQuery.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const synonyms = await getSynonyms();
  const expandedTokens = tokens.map(t => expandToken(t, synonyms));

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

  // Fetch a wider pool so scoring has enough to choose from
  const candidates = await prisma.product.findMany({
    where,
    take: Math.max(limit * 3, 120),
    select: {
      id: true, name: true, slug: true, price: true, salePrice: true,
      imageUrl: true, onOffer: true, stock: true, unitQty: true, unitType: true,
      description: true, sku: true, featured: true,
      category: { select: { name: true } },
    },
  });

  // Score and sort by relevance
  const scored = candidates
    .map(p => ({ p, score: scoreProduct(p, expandedTokens) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const result: SearchProduct[] = scored.slice(0, limit).map(({ p }) => ({
    id: p.id, name: p.name, slug: p.slug, price: p.price, salePrice: p.salePrice,
    imageUrl: p.imageUrl, onOffer: p.onOffer, stock: p.stock,
    unitQty: p.unitQty, unitType: p.unitType,
  }));

  if (result.length > 0 || q.length < 4) return result;

  // Fuzzy fallback when nothing matched at all
  return await fuzzySearch(q, limit);
}

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
