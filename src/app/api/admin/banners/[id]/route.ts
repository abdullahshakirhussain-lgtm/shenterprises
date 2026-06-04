import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = parseInt(params.id);
  const body = await req.json();
  const banner = await prisma.banner.update({
    where: { id },
    data: {
      imageUrl: body.imageUrl,
      headline: body.headline,
      subtitle: body.subtitle,
      buttonText: body.buttonText,
      buttonHref: body.buttonHref,
      sortOrder: body.sortOrder,
      active: body.active,
    }
  });
  return NextResponse.json(banner);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.banner.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ ok: true });
}
