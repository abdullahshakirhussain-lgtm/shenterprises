import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

/**
 * Bulk product actions.
 * Body: { action, productIds: number[], payload?: any }
 * Actions:
 *  - "set-price"     payload: { value: number }
 *  - "adjust-price"  payload: { percent: number }   // +/- %
 *  - "set-sale"      payload: { value: number | null }  // null = clear sale
 *  - "set-on-offer"  payload: { value: boolean }
 *  - "set-featured"  payload: { value: boolean }
 *  - "set-active"    payload: { value: boolean }
 *  - "set-stock"     payload: { value: number }
 *  - "adjust-stock"  payload: { delta: number }     // +/- units
 *  - "set-category"  payload: { categoryId: number | null }
 *  - "delete"        no payload
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { action, productIds, payload } = await req.json();
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: "No products selected" }, { status: 400 });
    }
    const ids = productIds.map((x: any) => parseInt(x)).filter((n: number) => !isNaN(n));

    let result: any = {};

    switch (action) {
      case "set-price":
        result = await prisma.product.updateMany({ where: { id: { in: ids } }, data: { price: Number(payload.value) } });
        break;

      case "adjust-price": {
        // Need to read & write individually for % adjustment
        const pct = Number(payload.percent);
        const products = await prisma.product.findMany({ where: { id: { in: ids } } });
        await prisma.$transaction(products.map(p =>
          prisma.product.update({
            where: { id: p.id },
            data: {
              price: Math.round(p.price * (1 + pct / 100) * 100) / 100,
              salePrice: p.salePrice != null
                ? Math.round(p.salePrice * (1 + pct / 100) * 100) / 100
                : null,
            }
          })
        ));
        result = { count: products.length };
        break;
      }

      case "set-sale":
        result = await prisma.product.updateMany({
          where: { id: { in: ids } },
          data: { salePrice: payload.value === null ? null : Number(payload.value) }
        });
        break;

      case "set-on-offer":
        result = await prisma.product.updateMany({ where: { id: { in: ids } }, data: { onOffer: !!payload.value } });
        break;

      case "set-featured":
        result = await prisma.product.updateMany({ where: { id: { in: ids } }, data: { featured: !!payload.value } });
        break;

      case "set-active":
        result = await prisma.product.updateMany({ where: { id: { in: ids } }, data: { active: !!payload.value } });
        break;

      case "set-stock":
        result = await prisma.product.updateMany({ where: { id: { in: ids } }, data: { stock: Math.max(0, parseInt(payload.value)) } });
        break;

      case "adjust-stock": {
        const delta = parseInt(payload.delta);
        const products = await prisma.product.findMany({ where: { id: { in: ids } } });
        await prisma.$transaction(products.map(p =>
          prisma.product.update({ where: { id: p.id }, data: { stock: Math.max(0, p.stock + delta) } })
        ));
        result = { count: products.length };
        break;
      }

      case "set-category":
        result = await prisma.product.updateMany({
          where: { id: { in: ids } },
          data: { categoryId: payload.categoryId != null ? parseInt(payload.categoryId) : null }
        });
        break;

      case "delete":
        // Cascade deletes on OrderItem will fail because productId is required.
        // We only allow deleting products that have no orders.
        const withOrders = await prisma.product.findMany({
          where: { id: { in: ids } },
          include: { _count: { select: { orderItems: true } } }
        });
        const safe = withOrders.filter(p => p._count.orderItems === 0).map(p => p.id);
        const skipped = withOrders.filter(p => p._count.orderItems > 0).map(p => ({ id: p.id, name: p.name }));
        if (safe.length) {
          await prisma.product.deleteMany({ where: { id: { in: safe } } });
        }
        result = { deleted: safe.length, skipped };
        break;

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
