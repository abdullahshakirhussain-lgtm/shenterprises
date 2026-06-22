import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/attribute-order
 * Called by the client after a successful checkout to attribute the order back
 * to anonymous AI Helper chat sessions (those that didn't have a userId).
 *
 * Body: { sessionId, browserId, orderId }
 */
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const sessionId = String(body?.sessionId || "");
  const browserId = String(body?.browserId || "");
  const orderId = Number(body?.orderId || 0);
  if (!orderId) return NextResponse.json({ ok: false, error: "orderId required" }, { status: 400 });

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { items: { select: { productId: true } } },
    });
    if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

    const orderedIds = order.items.map(it => it.productId);
    if (orderedIds.length === 0) return NextResponse.json({ ok: true, matched: 0 });

    // Find matching sessions — either the explicit sessionId, or recent unattributed
    // chats from the same browser
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const sessions = await prisma.chatSession.findMany({
      where: {
        startedAt: { gte: cutoff },
        orderId: null,
        OR: [
          ...(sessionId ? [{ id: sessionId }] : []),
          ...(browserId ? [{ browserId }] : []),
        ],
      },
      select: { id: true },
      take: 30,
    });
    if (sessions.length === 0) return NextResponse.json({ ok: true, matched: 0 });

    const sessionIds = sessions.map(s => s.id);
    const updated = await prisma.chatSuggestion.updateMany({
      where: {
        sessionId: { in: sessionIds },
        productId: { in: orderedIds },
        inOrderId: null,
      },
      data: { inOrderId: orderId },
    });

    if (updated.count > 0) {
      // Attribute first matching session to this order
      const firstMatch = await prisma.chatSuggestion.findFirst({
        where: { sessionId: { in: sessionIds }, inOrderId: orderId },
        select: { sessionId: true },
      });
      if (firstMatch) {
        await prisma.chatSession.update({
          where: { id: firstMatch.sessionId },
          data: { orderId, attributedAt: new Date() },
        });
      }
    }

    return NextResponse.json({ ok: true, matched: updated.count });
  } catch (e: any) {
    console.warn("[ai/attribute-order] failed:", e?.message);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
