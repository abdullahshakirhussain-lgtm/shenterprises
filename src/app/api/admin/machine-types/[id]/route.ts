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

// PATCH — partial update. Renaming a type cascades to Machine.category so the
// string join (Machine.category === MachineType.name) never goes stale.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await req.json();
    const id = parseInt(params.id);
    const existing = await prisma.machineType.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: any = {};
    if (b.name !== undefined) data.name = String(b.name).trim();
    if (b.slug !== undefined) data.slug = String(b.slug).trim() || slugify(data.name || existing.name);
    if (b.blurb !== undefined) data.blurb = b.blurb || null;
    if (b.seoIntro !== undefined) data.seoIntro = b.seoIntro || null;
    if (b.faq !== undefined) data.faq = serializeFaq(b.faq);
    if (b.sortOrder !== undefined) data.sortOrder = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0;

    const renamed = data.name && data.name !== existing.name;
    const [updated] = await prisma.$transaction([
      prisma.machineType.update({ where: { id }, data }),
      ...(renamed
        ? [prisma.machine.updateMany({ where: { category: existing.name }, data: { category: data.name } })]
        : []),
    ]);
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// DELETE — machines keep their category string; the hub page just disappears.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await prisma.machineType.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
