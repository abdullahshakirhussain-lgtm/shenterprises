import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Ask GPT-4o to scan a product list and group similar items that should be merged.
 *
 * Body: { categoryId?: number, productIds?: number[] }
 *  - If productIds: scan those specific products
 *  - If categoryId: scan all products in that category
 *  - If neither: scan all active products (capped at 200)
 *
 * Returns: {
 *   groups: [
 *     {
 *       keeperName: "1/2 inch Elastic",
 *       keeperId: 42,           // best candidate (cleanest name)
 *       members: [
 *         { id, name, suggestedVariants: [{ type: "color"|"size", name: string }] },
 *         ...
 *       ]
 *     }
 *   ]
 * }
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 400 });
  }

  try {
    const { categoryId, productIds } = await req.json();

    const where: any = { active: true };
    if (Array.isArray(productIds) && productIds.length > 0) {
      where.id = { in: productIds.map((x: any) => parseInt(x)).filter((n: number) => !isNaN(n)) };
    } else if (categoryId) {
      where.categoryId = parseInt(categoryId);
    }

    const products = await prisma.product.findMany({
      where,
      select: { id: true, name: true, sku: true, price: true, stock: true },
      take: 200,
      orderBy: { name: "asc" },
    });

    if (products.length < 2) {
      return NextResponse.json({ groups: [] });
    }

    const productList = products.map(p => `[${p.id}] ${p.name}${p.sku ? ` (SKU: ${p.sku})` : ""}`).join("\n");

    const prompt = `You are helping clean up an e-commerce catalog. Below is a list of products from a craft/tailoring supplies store. Some products are actually different variants (colors, sizes) of the SAME underlying product but were entered as separate items by accounting software.

Identify groups of products that should be merged into a single product. For each group:
- Pick the cleanest, most generic name as the "keeper" (without color/size in it ideally)
- For each other product in the group, identify what variant attribute distinguishes it (color name or size/length)

Return ONLY valid JSON, no markdown, no commentary. Format:
{
  "groups": [
    {
      "keeperName": "1/2 inch Elastic",
      "keeperId": 42,
      "members": [
        { "id": 43, "suggestedVariants": [{"type":"color","name":"Black"}, {"type":"size","name":"144 yards"}] },
        { "id": 44, "suggestedVariants": [{"type":"color","name":"White"}, {"type":"size","name":"144 yards"}] }
      ]
    }
  ]
}

Rules:
- type must be exactly "color" or "size"
- Only suggest a group if you're confident the products are truly variants of the same item
- A group needs at least 2 products
- The keeperId must be one of the product IDs in the group
- Skip products that don't fit any group
- If nothing should be merged, return {"groups": []}

Product list:
${productList}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0].message.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ groups: [] });

    const parsed = JSON.parse(jsonMatch[0]);
    const groups = (parsed.groups || []) as any[];

    // Hydrate with product names for UI rendering
    const allMembers = groups.flatMap(g => [g.keeperId, ...g.members.map((m: any) => m.id)]);
    const productMap = new Map(products.map(p => [p.id, p]));

    const hydrated = groups.map((g: any) => ({
      keeperId: g.keeperId,
      keeperName: g.keeperName,
      keeperOriginal: productMap.get(g.keeperId)?.name || "",
      members: g.members.map((m: any) => ({
        id: m.id,
        name: productMap.get(m.id)?.name || "",
        suggestedVariants: m.suggestedVariants || [],
      })).filter((m: any) => m.name), // filter unknowns
    })).filter((g: any) => g.members.length > 0);

    return NextResponse.json({ groups: hydrated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
