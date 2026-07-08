import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Suggest cross-brand equivalent model numbers for an industrial sewing machine.
 * Industrial machines are heavily cloned (e.g. the Juki DDL-8700 lockstitch has
 * dozens of brand equivalents), so this is genuinely useful cross-reference data.
 * ADMIN CONFIRMS — we only SUGGEST; the admin ticks what's accurate before saving.
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { brand, modelNumber, name, category } = await req.json();
  if (!modelNumber && !name) return NextResponse.json({ error: "Provide a model number or name" }, { status: 400 });

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 600,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an industrial sewing machine expert. Many industrial machines are the same underlying machine sold under different brands with different model numbers (clones of a well-known original — e.g. the Juki DDL-8700 single-needle lockstitch has equivalents from Jack, Zoje, Typical, SunStar, Brother clones, etc.).

Given a machine, list the well-known EQUIVALENT machines from OTHER brands (same machine class, interchangeable use). Only include equivalents you are reasonably confident about. Do NOT invent model numbers. It's fine to return few or none if unsure.

Respond ONLY JSON:
{"equivalents":[{"brand":"Juki","model":"DDL-8700","note":"the original this class is based on"},{"brand":"Jack","model":"JK-8720B"}]}`,
        },
        {
          role: "user",
          content: `Brand: ${brand || "Prime"}\nModel: ${modelNumber || "(unknown)"}\nName/type: ${name || "(unknown)"}\nCategory: ${category || "(unknown)"}`,
        },
      ],
    });

    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    const list = Array.isArray(parsed.equivalents) ? parsed.equivalents : [];
    const clean = list
      .filter((r: any) => r && (r.brand || r.model))
      .slice(0, 12)
      .map((r: any) => ({
        brand: String(r.brand || "").slice(0, 60),
        model: String(r.model || "").slice(0, 80),
        note: r.note ? String(r.note).slice(0, 160) : undefined,
      }));
    return NextResponse.json({ equivalents: clean });
  } catch (e: any) {
    console.warn("[machines/suggest-equivalents] failed:", e?.message);
    return NextResponse.json({ error: "AI suggestion failed — add equivalents manually." }, { status: 502 });
  }
}
