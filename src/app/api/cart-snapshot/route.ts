import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateSessionId } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  try {
    const { items, total } = await req.json();
    const sid = getOrCreateSessionId();
    await prisma.cart.upsert({
      where: { id: sid },
      update: { itemsJson: JSON.stringify(items || []), total: Number(total) || 0, abandoned: (items?.length || 0) > 0 },
      create: { id: sid, itemsJson: JSON.stringify(items || []), total: Number(total) || 0, abandoned: (items?.length || 0) > 0 }
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
