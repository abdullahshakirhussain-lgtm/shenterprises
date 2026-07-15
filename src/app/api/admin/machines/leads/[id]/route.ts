import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

// PATCH — toggle a machine lead's handled flag.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await req.json();
    const updated = await prisma.machineLead.update({
      where: { id: parseInt(params.id) },
      data: { handled: b.handled !== false },
    });
    return NextResponse.json({ ok: true, handled: updated.handled });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
