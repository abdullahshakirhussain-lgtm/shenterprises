import { NextRequest, NextResponse } from "next/server";
import { recordEvent } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await recordEvent({
      type: String(body.type || "ping"),
      path: body.path,
      productId: body.productId,
      quantity: body.quantity,
      value: body.value,
      meta: body.meta
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
