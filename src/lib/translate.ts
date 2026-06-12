import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Translate a short English phrase (typically a color, size, or length name)
 * to Sinhala and Tamil.
 * Returns { si, ta } strings, or null on failure (caller should fall back to English).
 */
export async function translateToSinhalaAndTamil(english: string): Promise<{ si: string; ta: string } | null> {
  if (!english.trim()) return { si: english, ta: english };
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 80,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a translator for a Sri Lankan craft and tailoring supply shop. Translate the given English term to Sinhala and Tamil. For color names use the standard Sinhala/Tamil color word. For sizes and measurements, keep numbers/units as-is but translate any descriptive English. Respond ONLY with JSON: {\"si\":\"<sinhala>\",\"ta\":\"<tamil>\"}",
        },
        {
          role: "user",
          content: english,
        },
      ],
    });
    const content = res.choices[0].message.content || "{}";
    const parsed = JSON.parse(content);
    if (typeof parsed.si === "string" && typeof parsed.ta === "string") {
      return { si: parsed.si.trim(), ta: parsed.ta.trim() };
    }
  } catch (e: any) {
    console.warn("[translate] failed:", e?.message);
  }
  return null;
}

/**
 * Translate a non-English query to English for searching.
 * Used by the search box to handle Sinhala/Tamil queries against the English product DB.
 * Returns the English query, or the original if translation fails / query is already English.
 */
export async function translateQueryToEnglish(query: string): Promise<string> {
  if (!query.trim()) return query;
  // Quick heuristic: if it's all ASCII, assume English
  if (/^[\x00-\x7F]+$/.test(query)) return query;
  if (!process.env.OPENAI_API_KEY) return query;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 60,
      messages: [
        {
          role: "system",
          content: "You translate search queries for a craft/tailoring supply shop from Sinhala or Tamil to English. Respond with ONLY the translated English query, no quotes, no explanation. Keep brand names and numbers as-is.",
        },
        { role: "user", content: query },
      ],
    });
    const out = res.choices[0].message.content?.trim();
    return out || query;
  } catch {
    return query;
  }
}
