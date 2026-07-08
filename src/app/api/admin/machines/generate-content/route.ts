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

EQUIVALENTS — be strict and honest (this is a high-ticket, trust-sensitive page):
- Only list a machine as an "equivalent" if it is a GENUINE INTERCHANGEABLE DROP-IN REPLACEMENT — the same commodity machine class where brands are essentially clones of one original, so parts/skills/output are the same. Classic clone classes: single-needle lockstitch (the Juki DDL-8700 class → Jack JK-8720, Zoje ZJ-A8800, Typical GC6-8, Brother clones), 4-thread overlock (Juki MO-6714 class → Jack C4, Siruba 747), bartack, buttonhole, feed-off-the-arm.
- Use CONCRETE model numbers, never vague "X series". If you can't name a concrete model, don't include it.
- DO NOT list premium, independently-engineered machines as equivalents of a budget/house brand. In particular, for multi-head EMBROIDERY machines, Tajima / Barudan / Happy / ZSK are premium originals that are NOT interchangeable clones — do NOT list them as equivalents. Only list true clone-market equivalents, or return an EMPTY list.
- When in doubt, return fewer or none. An empty equivalents list is correct and expected for premium/independent machine types. Wrong equivalents damage trust far more than an empty list.
- Keep notes ≤ 8 words, factual (e.g. "the original this class is based on").

- Keep description/FAQ factual and useful, not fluffy.

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

    // GPT returns equivalents in several shapes — normalise ALL of them:
    //   "Juki DDL-8700"                              (string)
    //   { brand:"Juki", model:"DDL-8700", note }     (canonical)
    //   { name:"Juki DDL-8700" } / { value:"..." }   (alt keys)
    // Also tolerate the array living under a couple of alternate top-level keys.
    function splitBrandModel(s: string): { brand: string; model: string } {
      const t = s.trim();
      const parts = t.split(/\s+/);
      if (parts.length === 1) return { brand: "", model: parts[0] };
      return { brand: parts[0], model: parts.slice(1).join(" ") };
    }
    function normEquiv(e: any): { brand: string; model: string; note?: string } | null {
      if (!e) return null;
      if (typeof e === "string") {
        const { brand, model } = splitBrandModel(e);
        return model ? { brand, model } : null;
      }
      let brand = String(e.brand || e.manufacturer || "").trim();
      let model = String(e.model || e.modelNumber || e.model_number || "").trim();
      const note = e.note || e.description || undefined;
      // If only a combined name/value was given, split it
      if (!model) {
        const combined = String(e.name || e.value || e.title || "").trim();
        if (combined) { const s = splitBrandModel(combined); brand = brand || s.brand; model = s.model; }
      }
      if (!brand && !model) return null;
      return { brand: brand.slice(0, 60), model: model.slice(0, 80), note: note ? String(note).slice(0, 160) : undefined };
    }

    const rawEquiv: any[] = Array.isArray(parsed.equivalents) ? parsed.equivalents
      : Array.isArray(parsed.equivalent_models) ? parsed.equivalent_models
      : Array.isArray(parsed.equivalentModels) ? parsed.equivalentModels
      : Array.isArray(parsed.alternatives) ? parsed.alternatives
      : [];
    const equivalents = rawEquiv
      .map(normEquiv)
      .filter((e): e is { brand: string; model: string; note?: string } => !!e)
      .slice(0, 12);
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
