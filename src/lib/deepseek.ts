// AI-assisted extraction for CSV import.
// Uses DeepSeek if configured, falls back to OpenAI GPT-4o-mini.
import { getSetting } from "./settings";

export type ExtractedProduct = {
  name: string;
  description?: string;
  price: number;
  sku?: string;
  stock?: number;
  category?: string;
};

const SYSTEM_PROMPT = `You are a product data extractor. Given a raw CSV row as JSON, extract and return ONLY a JSON object with these fields:
- name (string, required): product name
- description (string, optional): short product description
- price (number, required): selling price, must be a number
- sku (string, optional): product code or item code
- stock (number, optional): quantity available, default 0
- category (string, optional): product category

If a field is missing or unclear, omit it. Never guess price — if you cannot find it, return null for the whole object.`;

export async function extractWithDeepSeek(
  row: Record<string, any>,
  customPrompt?: string
): Promise<ExtractedProduct | null> {
  const deepseekKey = process.env.DEEPSEEK_API_KEY || (await getSetting("deepseek_api_key"));
  const openaiKey = process.env.OPENAI_API_KEY;

  const systemPrompt = customPrompt || (await getSetting("deepseek_prompt")) || SYSTEM_PROMPT;
  const userMsg = `CSV row data:\n${JSON.stringify(row)}\n\nReturn ONLY valid JSON.`;

  // Try DeepSeek first
  if (deepseekKey) {
    try {
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekKey}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMsg }],
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      });
      if (res.ok) {
        const data: any = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.name && typeof parsed.price === "number") return parsed as ExtractedProduct;
        }
      }
    } catch {}
  }

  // Fall back to OpenAI GPT-4o-mini
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMsg }],
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      });
      if (res.ok) {
        const data: any = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.name && typeof parsed.price === "number") return parsed as ExtractedProduct;
        }
      }
    } catch {}
  }

  return null;
}
