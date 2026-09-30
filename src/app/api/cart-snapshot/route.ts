import { readBody } from "@/lib/requestBody";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { getOrCreateSessionId } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`cart:${clientIp(req)}`, 60, 60).ok) return NextResponse.json({ ok: false });
    const text = new TextDecoder().decode(await readBody(req));
    if (text.length > 64000) return NextResponse.json({ ok: false });
    const { items, total } = JSON.parse(text);
    if (!Array.isArray(items) || typeof total !== "number" || !Number.isFinite(total) || total < 0 ||
        items.some((item: any) => !item || typeof item !== "object" || !Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000)) {
      return NextResponse.json({ ok: false });
    }
    // Bound the payload — reject obviously abusive snapshots (storage protection)
    if (Array.isArray(items) && items.length > 200) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }
    const sid = (await getOrCreateSessionId());
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
