import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const districts = await prisma.district.findMany({
    include: { cities: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" }
  });
  return NextResponse.json(districts);
}
