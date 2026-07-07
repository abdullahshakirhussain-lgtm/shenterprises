import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import OpenAI from "openai";
import path from "path";
import { readImageBuffer } from "@/lib/paths";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function imageToDataUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  const buf = await readImageBuffer(imageUrl);
  let urlPath = imageUrl;
  try { if (urlPath.startsWith("http")) urlPath = new URL(urlPath).pathname; } catch {}
  const ext = path.extname(urlPath).slice(1).toLowerCase() || "jpeg";
  const mime = ext === "jpg" ? "jpeg" : ext;
  return `data:image/${mime};base64,${buf.toString("base64")}`;
}

/**
 * OCR a machine photo — the model number and name are printed IN the image.
 * Returns { modelNumber, name, brand } extracted by GPT-4o vision. Never throws.
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { imageUrl } = await req.json();
  if (!imageUrl) return NextResponse.json({ error: "imageUrl required" }, { status: 400 });

  try {
    const dataUrl = await imageToDataUrl(imageUrl);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 300,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `This is a photo of an industrial sewing machine. The MODEL NUMBER and NAME are usually printed on the machine, a label, or the packaging in the image.

Read the text in the image and extract:
- "modelNumber": the machine's model/part number exactly as printed (e.g. "JK-8720", "GC6-28-1", "S-7200C"). Keep the exact characters, dashes and letters.
- "name": a short human product name/type (e.g. "Single Needle Direct Drive Lockstitch", "Overlock 4-Thread"). If not clearly stated, infer a sensible short type from what's visible.
- "brand": the brand printed on it (e.g. "Prime", "Juki", "Jack"). Default to "Prime" if none is visible.

If you truly cannot read a model number, return an empty string for it.

Respond ONLY with JSON: {"modelNumber":"...","name":"...","brand":"..."}`
            },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } }
          ]
        }
      ]
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    return NextResponse.json({
      modelNumber: String(parsed.modelNumber || "").trim().slice(0, 60),
      name: String(parsed.name || "").trim().slice(0, 160),
      brand: String(parsed.brand || "Prime").trim().slice(0, 40) || "Prime",
    });
  } catch (e: any) {
    console.warn("[machines/extract] failed:", e?.message);
    return NextResponse.json({ error: "Could not read the image. Fill in the details manually." }, { status: 502 });
  }
}
