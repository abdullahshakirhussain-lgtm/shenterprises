import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/userAuth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Please log in to leave a review" }, { status: 401 });
    const { productId, rating, title, body } = await req.json();
    if (!productId || !rating || !body) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    const r = Math.max(1, Math.min(5, parseInt(String(rating))));
    if (!body.trim() || body.length > 2000) return NextResponse.json({ error: "Review text required (max 2000 chars)" }, { status: 400 });

    // one review per user per product
    const existing = await prisma.review.findFirst({ where: { productId: parseInt(productId), userId: user.id } });
    if (existing) {
      const updated = await prisma.review.update({
        where: { id: existing.id },
        data: { rating: r, title: title || null, body }
      });
      return NextResponse.json(updated);
    }
    const created = await prisma.review.create({
      data: {
        productId: parseInt(productId),
        userId: user.id,
        name: user.fullName,
        rating: r,
        title: title || null,
        body,
        approved: true
      }
    });
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
