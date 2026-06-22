import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/userAuth";
import { getSetting } from "@/lib/settings";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  const globalRate = parseFloat((await getSetting("account_discount_percent")) || "0");
  const effectiveDiscount = user.discountRate > 0 ? user.discountRate : globalRate;
  return NextResponse.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      discountRate: effectiveDiscount,
      email: (user as any).email ?? null,
      addressLine1: (user as any).addressLine1 ?? null,
      addressLine2: (user as any).addressLine2 ?? null,
      districtName: (user as any).districtName ?? null,
    }
  });
}
