import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
    const slug = await uniqueSlug(slugify(name));
    const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const created = await prisma.category.create({ data: { name: name.trim(), slug, sortOrder: (max._max.sortOrder || 0) + 1 } });
    return NextResponse.json(created);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
async function uniqueSlug(base: string) {
  let s = base || "category"; let i = 1;
  while (await prisma.category.findUnique({ where: { slug: s } })) s = `${base}-${++i}`;
  return s;
}
