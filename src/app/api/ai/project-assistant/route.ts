import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { translateQueryToEnglish } from "@/lib/translate";
import { vectorSearchProducts } from "@/lib/embeddings";

export const dynamic = "force-dynamic";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Use the full GPT-4o model — significantly better reasoning than gpt-4o-mini
const MODEL = "gpt-4o";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Suggestion = {
  productId: number;
  slug: string;
  name: string;
  quantity: number;
  reason: string;
  price: number;          // effective display price (includes variant pricing fallback)
  fromPrice: boolean;     // true if multiple distinct prices exist → render as "From Rs X"
  salePrice: number | null;
  imageUrl: string | null;
  stock: number;
  similarity?: number;
};

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Accept both legacy { project } and new { messages } shape
  const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  const legacy = String(body?.project || "").trim();
  if (legacy && messages.length === 0) {
    messages.push({ role: "user", content: legacy });
  }
  if (messages.length === 0) {
    return NextResponse.json({ error: "Please describe your project." }, { status: 400 });
  }
  if (messages.some(m => m.content.length > 1500)) {
    return NextResponse.json({ error: "Message too long." }, { status: 400 });
  }

  const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content || "";

  // ---------- Vague-input detection: ask clarifying questions on first turn ----------
  // Only fire on the user's FIRST turn (no assistant has spoken yet)
  const isFirstTurn = messages.filter(m => m.role === "assistant").length === 0;
  if (isFirstTurn && shouldAskClarifying(lastUserMsg)) {
    const questions = await generateClarifyingQuestions(lastUserMsg);
    return NextResponse.json({
      mode: "clarify",
      message: questions.intro,
      questions: questions.list,
    });
  }

  // ---------- Build a single rich query from the conversation for embedding search ----------
  const englishQueryRaw = messages.filter(m => m.role === "user").map(m => m.content).join(" ");
  const englishQuery = await translateQueryToEnglish(englishQueryRaw);

  // ---------- Get the candidate set ----------
  // Try vector search first. If embeddings aren't set up, fall back to "all active".
  const vectorHits = await vectorSearchProducts(englishQuery, 24);
  let candidateIds: number[] = vectorHits.map(h => h.id);
  const similarityById = new Map(vectorHits.map(h => [h.id, h.similarity]));

  let products: any[];
  if (candidateIds.length > 0) {
    products = await prisma.product.findMany({
      where: { id: { in: candidateIds }, active: true },
      select: {
        id: true, name: true, slug: true, description: true,
        price: true, salePrice: true, imageUrl: true, stock: true,
        unitQty: true, unitType: true,
        category: { select: { name: true } },
        variants: { select: { type: true, name: true, price: true, salePrice: true } },
      },
    });
    // Preserve vector ordering
    products.sort((a, b) => (similarityById.get(b.id) ?? 0) - (similarityById.get(a.id) ?? 0));
  } else {
    // Fallback when no embeddings yet — fetch everything (cap at 200 for safety)
    products = await prisma.product.findMany({
      where: { active: true, imageUrl: { not: null } },
      orderBy: [{ featured: "desc" }, { onOffer: "desc" }, { updatedAt: "desc" }],
      take: 200,
      select: {
        id: true, name: true, slug: true, description: true,
        price: true, salePrice: true, imageUrl: true, stock: true,
        unitQty: true, unitType: true,
        category: { select: { name: true } },
        variants: { select: { type: true, name: true, price: true, salePrice: true } },
      },
    });
  }

  if (products.length === 0) {
    return NextResponse.json({
      mode: "suggestions",
      summary: "No matching products found in our catalog.",
      items: [],
      followUp: "Try a different project, or browse the shop?",
    });
  }

  // Compact catalog payload — name, category, price, variants per type
  const catalogForModel = products.map((p: any) => {
    const variants: { type: string; name: string }[] = p.variants || [];
    const colors = variants.filter(v => v.type === "color").map(v => v.name);
    const sizes = variants.filter(v => v.type === "size").map(v => v.name);
    const lengths = variants.filter(v => v.type === "length").map(v => v.name);
    const packs = variants.filter(v => v.type === "pack").map(v => v.name);
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
      ...(similarityById.has(p.id) ? { match: Math.round(similarityById.get(p.id)! * 100) } : {}),
    };
  });

  const systemPrompt = `You are a sewing & craft project advisor for SH Enterprises, a Sri Lankan craft and tailoring supply shop. You speak warmly, like a knowledgeable shop assistant — friendly, helpful, not robotic.

RULES — failure to follow these makes the suggestion useless:
1. Use exact product IDs from the catalog. Never invent products.
2. Suggest 3 to 8 items total. Quality over quantity.
3. Be realistic with quantities — a baby blanket needs ~2 spools of thread, not 20.
4. NEVER claim a product has a color/size/material the catalog doesn't list. Check the "colors" / "sizes" / "lengths" arrays. If the customer asked for "red" but no product has "red" in its colors array, say so honestly in the summary rather than inventing.
5. The "reason" field must be factual based on catalog data. Stick to function ("for stitching the seams") not invented properties ("comes in red"). Mention color/size only if it's actually listed.
6. If the catalog has nothing suitable, return an empty items array and explain in the summary.
7. End every response with a friendly follow-up offer in the "followUp" field — invite the customer to swap items, add things, refine the project, etc.

The "match" field on each catalog item is the semantic similarity score (higher = more relevant to the customer's project). Use this as a hint, but you can still pick lower-match items if they're functionally necessary.

Respond ONLY in JSON:
{
  "summary": "<2-sentence overview — warm, honest>",
  "items": [
    { "id": <product id>, "quantity": <int>, "reason": "<short factual sentence>" }
  ],
  "followUp": "<one short sentence inviting the next message>"
}`;

  // Build OpenAI messages: system prompt, then the conversation, then catalog
  const openaiMessages: any[] = [
    { role: "system", content: systemPrompt },
    ...messages,
    {
      role: "user",
      content: `Catalog (top ${products.length} candidates, ranked by semantic match):\n${JSON.stringify(catalogForModel)}`
    },
  ];

  let modelOut: any;
  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 1000,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: openaiMessages,
    });
    modelOut = JSON.parse(res.choices[0].message.content || "{}");
  } catch (e: any) {
    console.error("[project-assistant] OpenAI error:", e?.message);
    return NextResponse.json({ error: "AI is busy — please try again in a moment." }, { status: 502 });
  }

  const rawItems: Array<{ id: number; quantity: number; reason: string }> = Array.isArray(modelOut?.items) ? modelOut.items : [];
  const summary: string = typeof modelOut?.summary === "string" ? modelOut.summary : "";
  const followUp: string = typeof modelOut?.followUp === "string" ? modelOut.followUp : "Want me to swap anything or add more?";

  const byId = new Map(products.map((p: any) => [p.id, p]));
  const suggestions: Suggestion[] = [];
  for (const it of rawItems) {
    const p: any = byId.get(Number(it.id));
    if (!p) continue;
    const qty = Math.max(1, Math.min(20, Math.floor(Number(it.quantity) || 1)));

    // Compute the right display price the same way the catalog does — treat base of 0 as "no base set"
    const baseEffective = p.salePrice ?? p.price;
    const validBase = baseEffective > 0 ? baseEffective : null;
    const variantPrices = (p.variants || [])
      .map((v: any) => v.salePrice ?? v.price)
      .filter((n: any): n is number => n != null && n > 0);
    const priceCandidates: number[] = [...(validBase != null ? [validBase] : []), ...variantPrices];
    const effective = priceCandidates.length > 0 ? Math.min(...priceCandidates) : 0;
    const distinctPrices = new Set(priceCandidates).size;
    const fromPrice = distinctPrices > 1;

    suggestions.push({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      quantity: qty,
      reason: String(it.reason || "").slice(0, 200),
      price: effective,
      fromPrice,
      salePrice: p.salePrice,
      imageUrl: p.imageUrl,
      stock: p.stock,
      similarity: similarityById.get(p.id),
    });
  }

  return NextResponse.json({
    mode: "suggestions",
    summary,
    items: suggestions,
    followUp,
    usedVectorSearch: vectorHits.length > 0,
  });
}

// ===================================================================
// Clarifying-question logic
// ===================================================================

function shouldAskClarifying(input: string): boolean {
  const t = input.trim().toLowerCase();
  if (t.length < 15) return true;
  // "Vague intent" patterns — these almost always need more context
  const vaguePatterns = [
    /^(i (want|need|wanna|would like) to make )?(a |an )?(dress|blanket|gift|something|outfit|garment|piece)\.?$/,
    /^making (a |an )?(dress|blanket|gift|outfit|garment|piece)\.?$/,
    /^(what|which|how) do i need/,
    /^(help|hi|hey|hello|need help)/,
  ];
  return vaguePatterns.some(p => p.test(t));
}

async function generateClarifyingQuestions(userInput: string): Promise<{ intro: string; list: string[] }> {
  // Fast path: lightweight static fallback if AI is slow/down
  const fallback = {
    intro: "Happy to help! A couple of quick questions so I can recommend the right items:",
    list: [
      "What's the project — a specific garment, a craft, or a gift?",
      "Adult or child sized, or what dimensions?",
      "Any specific colors or fabric you're working with?",
    ],
  };

  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 250,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a Sri Lankan craft & tailoring shop assistant. The customer just said something vague. Generate 2-3 short clarifying questions that will help you understand their project. Be warm, not interrogative.

Respond in JSON:
{
  "intro": "<one warm intro sentence, e.g. 'Happy to help! A few quick questions so I can suggest the right items:'>",
  "list": ["<question 1>", "<question 2>", "<question 3 (optional)>"]
}`
        },
        { role: "user", content: userInput },
      ],
    });
    const out = JSON.parse(res.choices[0].message.content || "{}");
    if (typeof out.intro === "string" && Array.isArray(out.list) && out.list.length > 0) {
      return { intro: out.intro, list: out.list.slice(0, 3).map(String) };
    }
  } catch {}
  return fallback;
}
