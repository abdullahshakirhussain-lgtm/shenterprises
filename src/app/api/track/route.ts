import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { getPublicOrder } from "@/lib/orders";

export async function GET(req: NextRequest) {
  // Throttle enumeration: 20 lookups per IP per minute
  const rl = rateLimit(`track:${clientIp(req)}`, 20, 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const orderNumber = req.nextUrl.searchParams.get("order")?.trim();
  if (!orderNumber) return NextResponse.json({ error: "order number required" }, { status: 400 });

  const order = await getPublicOrder(orderNumber);
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ order });
}
