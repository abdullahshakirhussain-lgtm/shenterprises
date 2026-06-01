import { NextRequest, NextResponse } from "next/server";
import { applyCoupon } from "@/lib/coupons";
import { getCurrentUser } from "@/lib/userAuth";

export async function POST(req: NextRequest) {
  try {
    const { code, subtotal } = await req.json();
    const user = await getCurrentUser();
    const result = await applyCoupon(String(code || ""), Number(subtotal) || 0, user?.id);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
