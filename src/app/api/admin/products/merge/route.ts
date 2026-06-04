import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

/**
 * Merge multiple products into a "keeper" product.
 * Differences from keeper become variants (color or size).
 *
 * Body: {
 *   keeperId: number,
 *   members: [
 *     { id: number, variants: [{ type: "color" | "size", name: string }] },
 *     ...
 *   ]
 * }
 *
 * Process:
 *  1. Sum stocks of all members + keeper → keeper.stock
 *  2. Move OrderItems from members → keeper (snapshot names already on OrderItem.name)
 *  3. Move Reviews from members → keeper
 *  4. Move existing ProductVariants from members → keeper
 *  5. Create new ProductVariants on keeper from member.variants
 *  6. Delete members
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { keeperId, members } = await req.json();
    const kId = parseInt(keeperId);
    if (!kId || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: "keeperId and members required" }, { status: 400 });
    }

    const memberIds = members.map((m: any) => parseInt(m.id)).filter((n: number) => !isNaN(n) && n !== kId);
    if (memberIds.length === 0) {
      return NextResponse.json({ error: "Need at least one member to merge" }, { status: 400 });
    }

    const keeper = await prisma.product.findUnique({ where: { id: kId } });
    if (!keeper) return NextResponse.json({ error: "Keeper not found" }, { status: 404 });

    const memberProducts = await prisma.product.findMany({ where: { id: { in: memberIds } } });
    if (memberProducts.length !== memberIds.length) {
      return NextResponse.json({ error: "Some member products not found" }, { status: 404 });
    }

    // Existing variant sort order count on keeper
    const existingVariantCount = await prisma.productVariant.count({ where: { productId: kId } });

    // Sum stocks
    const summedStock = keeper.stock + memberProducts.reduce((s, p) => s + p.stock, 0);

    await prisma.$transaction(async (tx) => {
      // 1. Re-point OrderItems
      await tx.orderItem.updateMany({
        where: { productId: { in: memberIds } },
        data: { productId: kId },
      });

      // 2. Re-point Reviews
      await tx.review.updateMany({
        where: { productId: { in: memberIds } },
        data: { productId: kId },
      });

      // 3. Re-point existing ProductVariants on members → keeper
      await tx.productVariant.updateMany({
        where: { productId: { in: memberIds } },
        data: { productId: kId },
      });

      // 4. Create new variants for the merge specs
      let sortCursor = existingVariantCount;
      for (const m of members as any[]) {
        if (Array.isArray(m.variants)) {
          for (const v of m.variants) {
            if (!v.type || !v.name) continue;
            if (!["color", "size"].includes(v.type)) continue;
            // Dedupe — don't insert if a variant with same type+name already exists
            const exists = await tx.productVariant.findFirst({
              where: { productId: kId, type: v.type, name: v.name },
            });
            if (exists) continue;
            await tx.productVariant.create({
              data: {
                productId: kId,
                type: v.type,
                name: v.name,
                sortOrder: sortCursor++,
              },
            });
          }
        }
      }

      // 5. Update keeper's stock
      await tx.product.update({
        where: { id: kId },
        data: { stock: summedStock },
      });

      // 6. Delete members
      await tx.product.deleteMany({ where: { id: { in: memberIds } } });
    });

    return NextResponse.json({ ok: true, mergedCount: memberIds.length, newStock: summedStock });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
