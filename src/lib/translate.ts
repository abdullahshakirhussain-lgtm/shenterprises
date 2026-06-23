/**
 * Translation helpers backed by Google Translate's web endpoint
 * (translate.googleapis.com/translate_a/single).
 *
 * Why this and not OpenAI:
 * - OpenAI's general models do a mediocre job with Sinhala / Tamil compared to
 *   Google's purpose-built NMT models for those language pairs.
 * - No API key required (the endpoint is the one translate.google.com uses).
 * - Effectively free at our volume; we still keep it best-effort with a soft
 *   timeout so a slow endpoint never blocks the user's request.
 *
 * If the endpoint ever stops working we can swap in Google Cloud Translation
 * API (paid, requires a key) by editing this file only.
 */

const ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const TIMEOUT_MS = 6000;

/**
 * Translate a single string. Returns the translation, or the original on failure.
 */
async function googleTranslate(text: string, target: "si" | "ta" | "en", source = "auto"): Promise<string> {
  if (!text || !text.trim()) return text;
  try {
    const params = new URLSearchParams({
      client: "gtx",
      sl: source,
      tl: target,
      dt: "t",
      q: text,
    });
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      method: "GET",
      headers: {
        // A real browser UA helps avoid bot-throttling
        "User-Agent": "Mozilla/5.0 (compatible; SHEnterprisesBot/1.0)",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return text;
    const data: any = await res.json();
    // Response: [ [ [translated, original, …], … ], …other arrays… ]
    if (!Array.isArray(data) || !Array.isArray(data[0])) return text;
    const joined = data[0]
      .map((segment: any[]) => (Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : ""))
      .join("");
    return joined.trim() || text;
  } catch {
    return text;
  }
}

/**
 * Translate an English term (product name, variant name, etc) to both
 * Sinhala and Tamil. Used by admin POST/PATCH paths so storefront
 * pages can display in the customer's chosen language.
 */
export async function translateToSinhalaAndTamil(
  english: string
): Promise<{ si: string; ta: string } | null> {
  if (!english.trim()) return { si: english, ta: english };
  // Two translations run in parallel
  const [si, ta] = await Promise.all([
    googleTranslate(english, "si", "en"),
    googleTranslate(english, "ta", "en"),
  ]);
  // If both came back unchanged, treat as a failure so callers can persist null
  if (si === english && ta === english) return null;
  return { si, ta };
}

/**
 * Translate a search query (which may be in si/ta) to English so it can match
 * the English-language product catalog. Returns the original if it's already
 * ASCII / English-looking, or on failure.
 */
export async function translateQueryToEnglish(query: string): Promise<string> {
  if (!query.trim()) return query;
  // Quick heuristic: if it's all ASCII assume it's already English
  if (/^[\x00-\x7F]+$/.test(query)) return query;
  const out = await googleTranslate(query, "en", "auto");
  return out || query;
}
