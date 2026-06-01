// DeepSeek-assisted extraction for CSV import.
// Given a raw row (object) and a custom prompt, returns normalized product fields.
import { getSetting } from "./settings";

export type ExtractedProduct = {
  name: string;
  description?: string;
  price: number;
  sku?: string;
  stock?: number;
  category?: string;
};

export async function extractWithDeepSeek(
  row: Record<string, any>,
  customPrompt?: string
): Promise<ExtractedProduct | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY || (await getSetting("deepseek_api_key"));
  if (!apiKey) return null;

  const prompt =
    customPrompt ||
    (await getSetting("deepseek_prompt")) ||
    "Extract product fields and return JSON: name, description, price (number), sku, stock, category.";

  const userMsg = `Row JSON:\n${JSON.stringify(row)}\n\nReturn ONLY valid JSON with the fields described.`;

  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userMsg }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    if (!parsed.name || typeof parsed.price !== "number") return null;
    return parsed as ExtractedProduct;
  } catch {
    return null;
  }
}
