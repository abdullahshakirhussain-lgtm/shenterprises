import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Skip static prerendering — this route makes a DB query and would otherwise
// exhaust the Supabase pooler's 15-connection limit during the build.
export const dynamic = "force-dynamic";

export async function GET() {
  const districts = await prisma.district.findMany({
    include: { cities: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" }
  });
  return NextResponse.json(districts);
}
