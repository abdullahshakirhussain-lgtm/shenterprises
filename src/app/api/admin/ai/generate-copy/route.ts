import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import path from "path";
import fs from "fs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate product copy with GPT-4o vision.
 * Body: {
 *   action: "description" | "seo",
 *   productId?: number,         // if provided, pulls existing data from DB
 *   name?, description?, categoryName?, unitQty?, unitType?,
 *   variants?: { type: string; name: string }[],
 *   imageUrl?: string
 * }
 * Returns:
 *   action=description → { description: string }
 *   action=seo        → { metaTitle: string, metaDesc: string }
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });

  try {
    const body = await req.json();
    const action = body.action;
    if (!["description", "seo"].includes(action)) return NextResponse.json({ error: "action must be 'description' or 'seo'" }, { status: 400 });

    // Gather product context — either from DB (if productId given) or from the body
    let ctx = body;
    if (body.productId) {
      const p = await prisma.product.findUnique({
        where: { id: parseInt(body.productId) },
        include: { category: true, variants: true }
      });
      if (!p) return NextResponse.json({ error: "Product not found" }, { status: 404 });
      ctx = {
        name: p.name,
        description: p.description,
        categoryName: p.category?.name,
        unitQty: p.unitQty,
        unitType: p.unitType,
        variants: p.variants.map(v => ({ type: v.type, name: v.name })),
        imageUrl: p.imageUrl,
        // Allow overrides from body (e.g. if admin changed name in form but hasn't saved yet)
        ...body,
      };
    }

    const colorList = (ctx.variants || []).filter((v: any) => v.type === "color").map((v: any) => v.name).join(", ");
    const sizeList = (ctx.variants || []).filter((v: any) => v.type === "size").map((v: any) => v.name).join(", ");
    const lengthList = (ctx.variants || []).filter((v: any) => v.type === "length").map((v: any) => v.name).join(", ");

    const contextLines = [
      `Product name: ${ctx.name || "Unknown"}`,
      ctx.categoryName ? `Category: ${ctx.categoryName}` : null,
      ctx.unitQty && ctx.unitType ? `Unit: ${ctx.unitQty} ${ctx.unitType}` : null,
      colorList ? `Available colors: ${colorList}` : null,
      sizeList ? `Available sizes: ${sizeList}` : null,
      lengthList ? `Available lengths: ${lengthList}` : null,
      ctx.description && action === "seo" ? `Current description: ${ctx.description}` : null,
    ].filter(Boolean).join("\n");

    // Build messages with optional image
    const userContent: any[] = [];

    if (action === "description") {
      userContent.push({
        type: "text",
        text: `You are a copywriter for SH Enterprises, a Sri Lankan craft & tailoring supplies shop.

Product context:
${contextLines}

Write a SHORT, factual, customer-facing product description (2-3 sentences, max 60 words). Focus on what the product is, its key uses (sewing, tailoring, crafting), and notable features. Use the image to inform details. Do NOT mention SH Enterprises, the price, or include marketing fluff like "premium quality" — just describe what it is and what it's used for. Do NOT use emoji or special formatting.`
      });
    } else {
      userContent.push({
        type: "text",
        text: `You are an SEO copywriter for SH Enterprises, a Sri Lankan craft & tailoring supplies shop.

Product context:
${contextLines}

Generate SEO meta tags as JSON:
- metaTitle: under 60 characters, include the product name and key descriptor (e.g. "Polyester Thread Set — Buy in Sri Lanka")
- metaDesc: under 155 characters, mention the product type, key feature, and "delivery in Sri Lanka" or "Cash on delivery"

Respond ONLY with JSON: {"metaTitle":"...","metaDesc":"..."}`
      });
    }

    // Attach image if available
    if (ctx.imageUrl) {
      try {
        const dataUrl = await imageToDataUrl(ctx.imageUrl);
        userContent.push({ type: "image_url", image_url: { url: dataUrl, detail: "low" } });
      } catch {}
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: action === "description" ? 200 : 300,
      ...(action === "seo" ? { response_format: { type: "json_object" } } : {}),
      messages: [{ role: "user", content: userContent }],
    });

    const content = response.choices[0].message.content || "";

    if (action === "description") {
      return NextResponse.json({ description: content.trim() });
    } else {
      const parsed = JSON.parse(content);
      return NextResponse.json({
        metaTitle: (parsed.metaTitle || "").slice(0, 60),
        metaDesc: (parsed.metaDesc || "").slice(0, 155),
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function imageToDataUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  let urlPath: string;
  try {
    const u = new URL(imageUrl);
    urlPath = u.pathname;
  } catch {
    urlPath = imageUrl;
  }
  if (urlPath.startsWith("/uploads/")) {
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public");
    const filePath = path.join(uploadDir, urlPath);
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase() || "jpeg";
    const mime = ext === "jpg" ? "jpeg" : ext;
    return `data:image/${mime};base64,${buf.toString("base64")}`;
  }
  const res = await fetch(imageUrl);
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return `data:${contentType};base64,${buf.toString("base64")}`;
}
