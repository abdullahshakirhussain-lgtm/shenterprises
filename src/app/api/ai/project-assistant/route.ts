import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { translateQueryToEnglish } from "@/lib/translate";

export const dynamic = "force-dynamic";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Suggestion = {
  productId: number;
  slug: string;
  name: string;
  quantity: number;
  reason: string;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  stock: number;
};

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const projectText = String(body?.project || "").trim();
  if (!projectText || projectText.length < 4) {
    return NextResponse.json({ error: "Please describe your project in a bit more detail." }, { status: 400 });
  }
  if (projectText.length > 500) {
    return NextResponse.json({ error: "Project description is too long." }, { status: 400 });
  }

  const englishProject = await translateQueryToEnglish(projectText);

  // Compact catalog summary — include variants so the model can match on color/size/length
  const products = await prisma.product.findMany({
    where: { active: true },
    select: {
      id: true, name: true, slug: true, description: true,
      price: true, salePrice: true, imageUrl: true, stock: true,
      unitQty: true, unitType: true,
      category: { select: { name: true } },
      variants: { select: { type: true, name: true } },
    },
    take: 250,
  });

  if (products.length === 0) {
    return NextResponse.json({ summary: "No products in catalog yet.", items: [] });
  }

  // Only consider products with a real image — incomplete listings hallucinate badly
  const eligible = products.filter(p => !!p.imageUrl);

  // Pre-shrink descriptions and surface variant names by type so the model can see colors/sizes
  const catalogForModel = eligible.map(p => {
    const colors = p.variants.filter(v => v.type === "color").map(v => v.name);
    const sizes  = p.variants.filter(v => v.type === "size").map(v => v.name);
    const lengths = p.variants.filter(v => v.type === "length").map(v => v.name);
    const packs  = p.variants.filter(v => v.type === "pack").map(v => v.name);
    return {
      id: p.id,
      name: p.name,
      category: p.category?.name || "Uncategorized",
      price: p.salePrice ?? p.price,
      unit: p.unitQty && p.unitType ? `${p.unitQty} ${p.unitType}` : null,
      stock: p.stock,
      desc: (p.description || "").slice(0, 140),
      ...(colors.length ? { colors } : {}),
      ...(sizes.length ? { sizes } : {}),
      ...(lengths.length ? { lengths } : {}),
      ...(packs.length ? { packs } : {}),
    };
  });

  const systemPrompt = `You are a sewing & craft project advisor for SH Enterprises, a Sri Lankan craft and tailoring supply shop.

Given a customer's project, recommend items ONLY from the catalog provided.

CRITICAL RULES — failure to follow these makes the suggestion useless:
1. Use exact product IDs from the catalog. Never invent products.
2. Suggest 3 to 8 items total. Quality over quantity.
3. Be realistic with quantities — a baby blanket needs ~2 spools of thread, not 20.
4. NEVER claim a product has a color/size/material the catalog does not list. Check the "colors" / "sizes" / "lengths" arrays. If the customer asked for "red" but the product has no "red" listed in its colors array, do NOT suggest it. If the catalog has no products in the requested color, say so honestly in the summary rather than inventing one.
5. The "reason" field must be factual based on catalog data. Stick to FUNCTION ("for stitching the seams", "to fasten the closure") not invented properties ("comes in red"). Mention color/size only if it is actually listed in the product's variants.
6. If the catalog has no good matches, return an empty items array and explain why in the summary.

Respond ONLY in JSON:
{
  "summary": "<2-sentence overview — honest about what's available>",
  "items": [
    { "id": <product id>, "quantity": <int>, "reason": "<one short factual sentence>" }
  ]
}`;

  let modelOut: any;
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 800,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Project: ${englishProject}\n\nCatalog:\n${JSON.stringify(catalogForModel)}` },
      ],
    });
    modelOut = JSON.parse(res.choices[0].message.content || "{}");
  } catch (e: any) {
    console.error("[project-assistant] OpenAI error:", e?.message);
    return NextResponse.json({ error: "AI is busy — please try again in a moment." }, { status: 502 });
  }

  const rawItems: Array<{ id: number; quantity: number; reason: string }> = Array.isArray(modelOut?.items) ? modelOut.items : [];
  const summary: string = typeof modelOut?.summary === "string" ? modelOut.summary : "";

  // Hydrate with real product data — drop anything the model hallucinated
  const byId = new Map(products.map(p => [p.id, p]));
  const suggestions: Suggestion[] = [];
  for (const it of rawItems) {
    const p = byId.get(Number(it.id));
    if (!p) continue;
    const qty = Math.max(1, Math.min(20, Math.floor(Number(it.quantity) || 1)));
    suggestions.push({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      quantity: qty,
      reason: String(it.reason || "").slice(0, 200),
      price: p.salePrice ?? p.price,
      salePrice: p.salePrice,
      imageUrl: p.imageUrl,
      stock: p.stock,
    });
  }

  return NextResponse.json({
    summary,
    items: suggestions,
    translatedQuery: englishProject !== projectText ? englishProject : null,
  });
}
