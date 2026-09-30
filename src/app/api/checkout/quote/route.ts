import { readBody } from "@/lib/requestBody";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/userAuth";
import { checkoutSchema } from "@/lib/checkoutSchema";
import { calculateCheckoutQuote, loadCheckoutSettings } from "@/lib/checkoutQuote";
import { rateLimit, clientIp } from "@/lib/rateLimit";
const input = checkoutSchema.pick({ items: true, districtName: true, couponCode: true }).extend({ phone: z.string().regex(/^0\d{9}$/).optional() });
export async function POST(req: NextRequest) {
 try {
  if (!rateLimit("quote:" + clientIp(req), 90, 60).ok) return NextResponse.json({ error: "Please wait before refreshing your total." }, { status: 429 });
  const text = new TextDecoder().decode(await readBody(req));
  if (text.length > 64000) return NextResponse.json({ error: "Cart too large." }, { status: 413 });
  const body = input.parse(JSON.parse(text));
  const quote = await calculateCheckoutQuote(body, await getCurrentUser(), await loadCheckoutSettings());
  return NextResponse.json(quote, { headers: { "Cache-Control": "private, no-store" } });
 } catch (error: any) {
  const known = error instanceof z.ZodError || /^(This product|A selected|Please select|Some products|Coupon|You have|Minimum order)/.test(error?.message || "");
  return NextResponse.json({ error: known ? (error instanceof z.ZodError ? error.issues[0]?.message : error.message) : "Unable to refresh your total. Please try again." }, { status: 400 });
 }
}
