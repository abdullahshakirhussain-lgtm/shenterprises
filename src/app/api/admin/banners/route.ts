import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const banners = await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(banners);
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.imageUrl) return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
  const banner = await prisma.banner.create({
    data: {
      imageUrl: body.imageUrl,
      headline: body.headline || null,
      subtitle: body.subtitle || null,
      buttonText: body.buttonText || null,
      buttonHref: body.buttonHref || null,
      sortOrder: body.sortOrder ?? 0,
      active: body.active ?? true,
    }
  });
  return NextResponse.json(banner);
}
