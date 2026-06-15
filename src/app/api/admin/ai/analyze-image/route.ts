import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import OpenAI from "openai";
import path from "path";
import { readImageBuffer } from "@/lib/paths";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function imageToDataUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  const buf = await readImageBuffer(imageUrl);
  // Pick MIME from extension
  let urlPath = imageUrl;
  try { if (urlPath.startsWith("http")) urlPath = new URL(urlPath).pathname; } catch {}
  const ext = path.extname(urlPath).slice(1).toLowerCase() || "jpeg";
  const mime = ext === "jpg" ? "jpeg" : ext;
  return `data:image/${mime};base64,${buf.toString("base64")}`;
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { imageUrl, productName } = await req.json();
  if (!imageUrl) return NextResponse.json({ error: "imageUrl required" }, { status: 400 });

  try {
    const dataUrl = await imageToDataUrl(imageUrl);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `This image shows multiple color variants of a product${productName ? ` called "${productName}"` : ""}.
Identify each distinct color variant visible in the image.
For each variant, return a bounding box as percentages of the total image dimensions (0-100).
Return ONLY valid JSON array, no explanation, no markdown. Format:
[
  { "name": "Red", "x": 5, "y": 5, "width": 40, "height": 90 },
  { "name": "Blue", "x": 55, "y": 5, "width": 40, "height": 90 }
]
Rules:
- x, y are the top-left corner as % of image width/height
- width, height are the crop size as % of image width/height
- name should be a precise color name (e.g. "Navy Blue", "Crimson Red", "Forest Green")
- Include ALL distinct colors/variants you can see
- Keep bounding boxes tight around each variant`
            },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "high" }
            }
          ]
        }
      ]
    });

    const content = response.choices[0].message.content || "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ error: "AI returned invalid response" }, { status: 500 });
    const variants = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ variants });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
