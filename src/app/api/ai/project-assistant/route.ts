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

  // Compact catalog summary — only fields the model needs to reason + match
  const products = await prisma.product.findMany({
    where: { active: true },
    select: {
      id: true, name: true, slug: true, description: true,
      price: true, salePrice: true, imageUrl: true, stock: true,
      unitQty: true, unitType: true,
      category: { select: { name: true } },
    },
    take: 250,
  });

  if (products.length === 0) {
    return NextResponse.json({ summary: "No products in catalog yet.", items: [] });
  }

  // Pre-shrink descriptions so we don't blow the context window
  const catalogForModel = products.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category?.name || "Uncategorized",
    price: p.salePrice ?? p.price,
    unit: p.unitQty && p.unitType ? `${p.unitQty} ${p.unitType}` : null,
    stock: p.stock,
    desc: (p.description || "").slice(0, 140),
  }));

  const systemPrompt = `You are a sewing & craft project advisor for SH Enterprises, a Sri Lankan craft and tailoring supply shop.

Given a customer's project, recommend items ONLY from the catalog provided. Be realistic with quantities — a baby blanket needs ~2 spools of thread, not 20.

Rules:
- Suggest 3 to 8 items total
- Use exact product IDs from the catalog
- Quantities are integer units of the listing (e.g. "1" means one packet/spool/piece)
- Skip items the customer doesn't need — quality over quantity
- If you can't suggest anything sensible (e.g. catalog is unrelated to the project), return an empty items array with a friendly explanation

Respond ONLY in JSON:
{
  "summary": "<2-sentence overview of what they'll need>",
  "items": [
    { "id": <product id>, "quantity": <int>, "reason": "<one short sentence on why>" }
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
