import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readJson } from "@/lib/requestBody";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { findReviewOrder, reviewerName, REVIEW_DONE_KIND } from "@/lib/reviewRequests";

const schema = z.object({
  code: z.string().max(20),
  reviews: z.array(z.object({
    productId: z.number().int().positive(),
    rating: z.number().int().min(1).max(5),
    body: z.string().max(1000).optional(),
  })).min(1).max(50),
});

// Reviews from the post-delivery SMS link: verified buyers, no login needed.
// One submission per order; only products that were in that order.
export async function POST(req: NextRequest) {
  try {
    if (!rateLimit("order-review:" + clientIp(req), 20, 600).ok) return NextResponse.json({ error: "Too many attempts. Please try later." }, { status: 429 });
    const body = schema.parse(await readJson(req));
    const order = await findReviewOrder(body.code);
    if (!order) return NextResponse.json({ error: "This review link has expired." }, { status: 400 });
    if (order.alreadyReviewed) return NextResponse.json({ error: "This order has already been reviewed." }, { status: 409 });
    const allowed = new Set(order.items.map(i => i.productId));
    const reviews = body.reviews.filter(r => allowed.has(r.productId));
    if (!reviews.length) return NextResponse.json({ error: "Please rate an item from your order." }, { status: 400 });

    const name = reviewerName(order.fullName);
    await prisma.$transaction(async tx => {
      // Unique (orderId, kind) makes a second submission fail here, atomically.
      await tx.orderJob.create({ data: { orderId: order.orderId, kind: REVIEW_DONE_KIND, completedAt: new Date() } });
      await tx.review.createMany({
        data: reviews.map(r => ({ productId: r.productId, name, rating: r.rating, body: (r.body || "").trim(), approved: true })),
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "This order has already been reviewed." }, { status: 409 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Please check your ratings and try again." }, { status: 400 });
    return NextResponse.json({ error: "Couldn't save your review. Please try again." }, { status: 500 });
  }
}
