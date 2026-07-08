import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate all SEO content for a machine in one grounded GPT-4o pass:
 * description, seoIntro, cross-brand equivalents, and FAQ.
 *
 * Grounding rules baked into the prompt:
 *  - Use ONLY the specs the admin provided; never invent specific numbers.
 *  - Equivalents are derived from the machine CLASS (name/category/specs), which
 *    is far more reliable than mapping an obscure house-brand model number. This
 *    is why the old "suggest by model number" felt weak for the Prime brand.
 *  - Everything is a SUGGESTION the admin reviews before saving.
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { brand, modelNumber, name, category, specs } = await req.json();
  if (!name && !modelNumber) return NextResponse.json({ error: "Provide at least a name or model number" }, { status: 400 });

  const specLines = Array.isArray(specs)
    ? specs.filter((s: any) => s?.key || s?.value).map((s: any) => `${s.key}: ${s.value}`).join("; ")
    : "";

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1400,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert industrial sewing machine copywriter and SEO specialist for SH Enterprises, a Sri Lankan dealer. You write for high-intent commercial buyers (tailors, garment factories).

Industrial sewing machines are heavily cloned: most house-brand machines are the same underlying machine as a well-known original (e.g. a single-needle direct-drive lockstitch is the "Juki DDL-8700 class"; a 4-thread overlock is the "Juki MO-6714 class"). Buyers search by the brand they already know. So identifying the CLASS and its well-known equivalents is the whole SEO game.

GROUNDING RULES (important):
- Use ONLY the specs provided. NEVER invent specific numbers (speed, needle, motor watts) that weren't given. If a spec is unknown, describe it in general terms ("high-speed", "servo motor") without a fake figure.
- Derive equivalents from the machine CLASS/TYPE, not from trying to decode the house-brand model number. Only list equivalents you're genuinely confident share the same class. Few accurate ones beat many wrong ones.
- Keep it factual and useful, not fluffy.

Return ONLY JSON:
{
  "description": "<2-3 short paragraphs: what it is, what it's for, who it suits. Plain text, \\n\\n between paragraphs.>",
  "seoIntro": "<ONE keyword-rich lead sentence/paragraph naming brand + model + machine type + 'Sri Lanka' + the top equivalent, reads naturally>",
  "equivalents": [ { "brand": "Juki", "model": "DDL-8700", "note": "the original this class is based on" } ],
  "faq": [ { "q": "...", "a": "..." } ]
}

FAQ guidance: 4-5 questions a real buyer would search, e.g. "Is the {brand} {model} the same as the {equivalent}?", "What is the {brand} {model} used for?", "Does it come with a warranty in Sri Lanka?", "What motor does it use?" (only if given). Answers 1-3 sentences.`,
        },
        {
          role: "user",
          content: `Brand: ${brand || "Prime"}
Model number: ${modelNumber || "(unknown)"}
Name/type: ${name || "(unknown)"}
Category: ${category || "(unknown)"}
Known specs: ${specLines || "(none provided)"}`,
        },
      ],
    });

    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    const equivalents = (Array.isArray(parsed.equivalents) ? parsed.equivalents : [])
      .filter((e: any) => e && (e.brand || e.model))
      .slice(0, 12)
      .map((e: any) => ({
        brand: String(e.brand || "").slice(0, 60),
        model: String(e.model || "").slice(0, 80),
        note: e.note ? String(e.note).slice(0, 160) : undefined,
      }));
    const faq = (Array.isArray(parsed.faq) ? parsed.faq : [])
      .filter((f: any) => f && (f.q || f.a))
      .slice(0, 6)
      .map((f: any) => ({ q: String(f.q || "").slice(0, 200), a: String(f.a || "").slice(0, 800) }));

    return NextResponse.json({
      description: String(parsed.description || "").slice(0, 2500),
      seoIntro: String(parsed.seoIntro || "").slice(0, 500),
      equivalents,
      faq,
    });
  } catch (e: any) {
    console.warn("[machines/generate-content] failed:", e?.message);
    return NextResponse.json({ error: "AI generation failed — try again in a moment." }, { status: 502 });
  }
}
