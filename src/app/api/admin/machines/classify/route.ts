import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * AI bulk-assign: classify every machine into one of the admin-defined
 * MachineTypes from its name/model, then write Machine.category. One GPT-4o
 * JSON pass for the whole inventory — the admin reviews/corrects afterwards.
 *
 * Body: { onlyMissing?: boolean } — default true (don't overwrite existing
 * categories); pass false to re-classify everything.
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const onlyMissing = body?.onlyMissing !== false;

  const [types, machines] = await Promise.all([
    prisma.machineType.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.machine.findMany({
      where: onlyMissing ? { OR: [{ category: null }, { category: "" }] } : {},
      select: { id: true, name: true, modelNumber: true, brand: true, category: true },
    }),
  ]);
  if (types.length === 0) return NextResponse.json({ error: "Create machine types first" }, { status: 400 });
  if (machines.length === 0) return NextResponse.json({ ok: true, assigned: [], message: "Nothing to classify" });

  const typeNames = types.map(t => t.name);

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 3000,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You classify industrial sewing/garment machines into types. Allowed types (use EXACT strings): ${JSON.stringify(typeNames)}.
Return ONLY JSON: { "assignments": [ { "id": <machineId>, "type": "<one allowed type or null if none fits>" } ] }.
Classify from the machine's name (e.g. "Four Head Embroidery" -> the embroidery type; "Round Knife Cutting Machine" -> the cutting type). Use null when genuinely no type fits — do not force a bad match.`,
        },
        {
          role: "user",
          content: JSON.stringify(machines.map(m => ({ id: m.id, name: m.name, model: `${m.brand} ${m.modelNumber}` }))),
        },
      ],
    });

    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    const raw: any[] = Array.isArray(parsed.assignments) ? parsed.assignments : [];
    const byId = new Map(machines.map(m => [m.id, m]));
    const assigned: { id: number; name: string; type: string }[] = [];

    for (const a of raw) {
      const m = byId.get(Number(a?.id));
      const type = typeof a?.type === "string" ? a.type.trim() : "";
      if (!m || !type || !typeNames.includes(type)) continue; // reject invented types
      await prisma.machine.update({ where: { id: m.id }, data: { category: type } });
      assigned.push({ id: m.id, name: m.name, type });
    }

    return NextResponse.json({
      ok: true,
      total: machines.length,
      assigned,
      unassigned: machines.filter(m => !assigned.some(a => a.id === m.id)).map(m => ({ id: m.id, name: m.name })),
    });
  } catch (e: any) {
    console.warn("[machines/classify] failed:", e?.message);
    return NextResponse.json({ error: "Classification failed — try again in a moment." }, { status: 502 });
  }
}
