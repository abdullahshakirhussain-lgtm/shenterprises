import { NextRequest, NextResponse } from "next/server";
import { calculateDeliveryFee } from "@/lib/koombiyo";

export async function POST(req: NextRequest) {
  try {
    const { district, city, subtotal } = await req.json();
    if (!district) return NextResponse.json({ error: "Missing district" }, { status: 400 });
    const result = await calculateDeliveryFee(String(district), String(city || ""), Number(subtotal) || 0);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
