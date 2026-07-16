import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

function serializeFaq(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const clean = v
      .filter((r: any) => r && (r.q || r.a))
      .map((r: any) => ({ q: String(r.q || "").slice(0, 200), a: String(r.a || "").slice(0, 800) }));
    return clean.length ? JSON.stringify(clean) : null;
  }
  return null;
}

// GET — list types (admin form dropdowns + admin types page)
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const types = await prisma.machineType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return NextResponse.json(types);
}

// POST — create a type
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await req.json();
    const name = String(b.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const created = await prisma.machineType.create({
      data: {
        name,
        slug: (b.slug ? String(b.slug).trim() : "") || slugify(name),
        blurb: b.blurb || null,
        seoIntro: b.seoIntro || null,
        faq: serializeFaq(b.faq),
        sortOrder: Number.isFinite(b.sortOrder) ? Number(b.sortOrder) : 0,
      },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
