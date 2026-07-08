import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

function serializeSpecs(specs: any): string | null {
  if (!specs) return null;
  if (typeof specs === "string") return specs;
  if (Array.isArray(specs)) {
    const clean = specs
      .filter((r: any) => r && (r.key || r.value))
      .map((r: any) => ({ key: String(r.key || "").slice(0, 120), value: String(r.value || "").slice(0, 400) }));
    return clean.length ? JSON.stringify(clean) : null;
  }
  return null;
}
function serializeEquivalents(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const clean = v
      .filter((r: any) => r && (r.brand || r.model))
      .map((r: any) => ({ brand: String(r.brand || "").slice(0, 60), model: String(r.model || "").slice(0, 80), note: r.note ? String(r.note).slice(0, 160) : undefined }));
    return clean.length ? JSON.stringify(clean) : null;
  }
  return null;
}
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

// PATCH — true partial update (only fields present in the body)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await req.json();
    const id = parseInt(params.id);
    const data: any = {};

    if (b.modelNumber !== undefined) data.modelNumber = String(b.modelNumber).trim();
    if (b.brand !== undefined)       data.brand = (b.brand || "Prime").trim();
    if (b.name !== undefined)        data.name = String(b.name).trim();
    if (b.category !== undefined)    data.category = b.category || null;
    if (b.price !== undefined)       data.price = b.price == null || b.price === "" ? null : parseFloat(b.price);
    if (b.imageUrl !== undefined)    data.imageUrl = b.imageUrl || null;
    if (b.images !== undefined)      data.images = typeof b.images === "string" ? b.images : (Array.isArray(b.images) ? JSON.stringify(b.images) : null);
    if (b.description !== undefined) data.description = b.description || null;
    if (b.specs !== undefined)       data.specs = serializeSpecs(b.specs);
    if (b.warrantyInfo !== undefined) data.warrantyInfo = b.warrantyInfo || null;
    if (b.equivalents !== undefined) data.equivalents = serializeEquivalents(b.equivalents);
    if (b.faq !== undefined)         data.faq = serializeFaq(b.faq);
    if (b.seoIntro !== undefined)    data.seoIntro = b.seoIntro || null;
    if (b.active !== undefined)      data.active = b.active !== false;

    const updated = await prisma.machine.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// DELETE
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await prisma.machine.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
