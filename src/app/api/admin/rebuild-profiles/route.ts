import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { rebuildAllProfiles } from "@/lib/customerProfile";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min ceiling for large catalogs

// Manual trigger from the admin UI.
export async function POST() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const start = Date.now();
  const result = await rebuildAllProfiles();
  return NextResponse.json({ ...result, elapsedMs: Date.now() - start });
}

// Quick status — used by the admin page to show current counts.
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [total, byType] = await Promise.all([
    prisma.customerProfile.count(),
    prisma.customerProfile.groupBy({
      by: ["customerType"],
      _count: { customerType: true },
      orderBy: { _count: { customerType: "desc" } },
    }),
  ]);

  return NextResponse.json({
    total,
    byType: byType.map(r => ({ type: r.customerType, count: r._count.customerType })),
  });
}
