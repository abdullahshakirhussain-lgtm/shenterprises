import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/feedback
 * Handles three kinds of feedback signals from the AI Helper UI.
 * Designed to never break the user's experience — all errors are soft.
 *
 * Body shapes:
 *  { sessionId, suggestionId, thumbsUp: true|false }   // explicit thumbs
 *  { sessionId, productId, addedToCart: true }         // implicit add signal
 *  { sessionId, ratingScore: 1..5, ratingComment?: string }  // overall session rating
 */
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const sessionId = String(body?.sessionId || "");
  if (!sessionId) return NextResponse.json({ ok: false, error: "sessionId required" }, { status: 400 });

  try {
    // --- Thumbs up/down on a specific suggestion ---
    if (body.suggestionId != null && typeof body.thumbsUp === "boolean") {
      await prisma.chatSuggestion.update({
        where: { id: Number(body.suggestionId) },
        data: { thumbsUp: body.thumbsUp, thumbsAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    }

    // --- Mark a suggestion as added to cart (by product id within the session) ---
    if (body.productId != null && body.addedToCart === true) {
      const productId = Number(body.productId);
      // Find the most recent un-marked suggestion for this product in this session
      const sugg = await prisma.chatSuggestion.findFirst({
        where: { sessionId, productId, addedToCart: false },
        orderBy: { createdAt: "desc" },
      });
      if (sugg) {
        await prisma.chatSuggestion.update({
          where: { id: sugg.id },
          data: { addedToCart: true, addedToCartAt: new Date() },
        });
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: { addedCount: { increment: 1 } },
        });
      }
      return NextResponse.json({ ok: true });
    }

    // --- Explicit session rating (1..5) ---
    if (typeof body.ratingScore === "number") {
      const score = Math.max(1, Math.min(5, Math.floor(body.ratingScore)));
      const comment = typeof body.ratingComment === "string" ? body.ratingComment.slice(0, 1000) : null;
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { ratingScore: score, ratingComment: comment, ratedAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Unknown feedback shape" }, { status: 400 });
  } catch (e: any) {
    console.warn("[ai/feedback] failed:", e?.message);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
