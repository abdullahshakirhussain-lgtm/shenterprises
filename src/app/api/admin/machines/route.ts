import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";

// Normalise incoming specs into a JSON string of [{key,value}] rows.
function serializeSpecs(specs: any): string | null {
  if (!specs) return null;
  if (typeof specs === "string") return specs; // already JSON
  if (Array.isArray(specs)) {
    const clean = specs
      .filter((r: any) => r && (r.key || r.value))
      .map((r: any) => ({ key: String(r.key || "").slice(0, 120), value: String(r.value || "").slice(0, 400) }));
    return clean.length ? JSON.stringify(clean) : null;
  }
  return null;
}

// Equivalents: [{ brand, model, note? }]
function serializeEquivalents(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const clean = v
      .filter((r: any) => r && (r.brand || r.model))
      .map((r: any) => ({
        brand: String(r.brand || "").slice(0, 60),
        model: String(r.model || "").slice(0, 80),
        note: r.note ? String(r.note).slice(0, 160) : undefined,
      }));
    return clean.length ? JSON.stringify(clean) : null;
  }
  return null;
}

// FAQ: [{ q, a }]
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

async function uniqueSlug(base: string) {
  let s = base || "machine"; let i = 1;
  while (await prisma.machine.findUnique({ where: { slug: s } })) s = `${base}-${++i}`;
  return s;
}

// POST — create a machine
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await req.json();
    if (!b.name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    if (!b.modelNumber) return NextResponse.json({ error: "Model number required" }, { status: 400 });

    const brand = (b.brand || "Prime").trim();
    // Slug incorporates brand + model number for SEO, e.g. prime-jk-8720
    const slugBase = slugify(`${brand}-${b.modelNumber}`) || slugify(b.name);
    const slug = await uniqueSlug(slugBase);

    const created = await prisma.machine.create({
      data: {
        modelNumber: String(b.modelNumber).trim(),
        brand,
        name: String(b.name).trim(),
        slug,
        category: b.category || null,
        price: b.price != null && b.price !== "" ? parseFloat(b.price) : null,
        imageUrl: b.imageUrl || null,
        images: typeof b.images === "string" ? b.images : (Array.isArray(b.images) ? JSON.stringify(b.images) : null),
        description: b.description || null,
        specs: serializeSpecs(b.specs),
        warrantyInfo: b.warrantyInfo || null,
        equivalents: serializeEquivalents(b.equivalents),
        faq: serializeFaq(b.faq),
        seoIntro: b.seoIntro || null,
        homeOrder: b.homeOrder != null && b.homeOrder !== "" ? parseInt(b.homeOrder) : null,
        active: b.active !== false,
      },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
