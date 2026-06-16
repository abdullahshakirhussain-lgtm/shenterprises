import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const data: any = {};
    if (b.approved !== undefined) data.approved = !!b.approved;
    const updated = await prisma.review.update({ where: { id: parseInt(params.id) }, data });
    return NextResponse.json(updated);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.review.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
