import { NextRequest, NextResponse } from "next/server";
import { recordEvent } from "@/lib/analytics";
import { rateLimit, clientIp } from "@/lib/rateLimit";

// Allow-list of event types we accept — anything else is dropped so the public
// endpoint can't be used to write arbitrary junk rows.
const ALLOWED_TYPES = new Set([
  "page_view", "ping", "product_view", "search", "add_to_cart",
  "remove_from_cart", "begin_checkout", "purchase", "whatsapp_click",
  "machine_call",
]);

export async function POST(req: NextRequest) {
  try {
    // Public + unauthenticated → throttle hard to stop DB-flood abuse.
    // 120 events/min per IP is far above real single-user browsing.
    const rl = rateLimit(`analytics:${clientIp(req)}`, 120, 60);
    if (!rl.ok) return NextResponse.json({ ok: false }, { status: 200 });

    const body = await req.json();
    const type = String(body.type || "ping");
    if (!ALLOWED_TYPES.has(type)) return NextResponse.json({ ok: false }, { status: 200 });

    // Cap the meta payload so a big blob can't bloat the DB.
    let meta = body.meta;
    if (meta != null) {
      const s = JSON.stringify(meta);
      if (s.length > 2000) meta = undefined;
    }

    await recordEvent({
      type,
      path: typeof body.path === "string" ? body.path.slice(0, 300) : undefined,
      productId: Number.isInteger(body.productId) ? body.productId : undefined,
      quantity: Number.isInteger(body.quantity) ? body.quantity : undefined,
      value: typeof body.value === "number" && isFinite(body.value) ? body.value : undefined,
      meta,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // Analytics errors (often Supabase connection drops) should never bubble up to the user
    // Return 200 OK silently so the client doesn't retry or log errors
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
