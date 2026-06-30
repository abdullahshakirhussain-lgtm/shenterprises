import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateSessionId } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  try {
    const { items, total } = await req.json();
    // Bound the payload — reject obviously abusive snapshots (storage protection)
    if (Array.isArray(items) && items.length > 200) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }
    const sid = getOrCreateSessionId();
    await prisma.cart.upsert({
      where: { id: sid },
      update: { itemsJson: JSON.stringify(items || []), total: Number(total) || 0, abandoned: (items?.length || 0) > 0 },
      create: { id: sid, itemsJson: JSON.stringify(items || []), total: Number(total) || 0, abandoned: (items?.length || 0) > 0 }
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // Cart-snapshot is fire-and-forget — don't surface errors to the user
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
