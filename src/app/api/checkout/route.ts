import { readBody } from "@/lib/requestBody";
import { persistentRateLimit } from "@/lib/persistentRateLimit";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDeliveryFee, isValidDistrict } from "@/lib/sriLankaDistricts";
import { generateOrderNumber } from "@/lib/utils";
import { z } from "zod";
import { checkoutSchema as schema } from "@/lib/checkoutSchema";
import { calculateCheckoutQuote, loadCheckoutSettings } from "@/lib/checkoutQuote";
import { getOrCreateSessionId, recordEvent, attachPhoneToSession } from "@/lib/analytics";
import { getCurrentUser, normalizePhone } from "@/lib/userAuth";
import { applyCoupon } from "@/lib/coupons";
import { getSetting } from "@/lib/settings";
import { createHash } from "crypto";
import { selectedPrice, validateSelection } from "@/lib/commerce";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { drainOrderJobs } from "@/lib/orderJobs";

// Sri Lankan local format: starts with 0, exactly 10 digits, nothing else.
const LOCAL_PHONE = /^0\d{9}$/;

// Bank slip URLs must point at our own storage — never an arbitrary external URL.
function isAllowedSlipUrl(url: string): boolean {
 if (/^\/api\/slips\/[a-f0-9-]{36}\.(pdf|png|jpg|webp)$/i.test(url)) return true;
 // Existing orders/files are retained. New checkout uploads always use the private route.
 return false;
}

export async function POST(req: NextRequest) {
  try {
    if (!(await persistentRateLimit("checkout:" + clientIp(req), 12, 600)).ok) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    if (!rateLimit("checkout:" + clientIp(req), 12, 600).ok) return NextResponse.json({ error: "Please wait a few minutes before trying again." }, { status: 429 });
    const raw = new TextDecoder().decode(await readBody(req));
    if (raw.length > 64000) return NextResponse.json({ error: "Order is too large." }, { status: 413 });
    const body = schema.parse(JSON.parse(raw));
    const checkoutKey = req.headers.get("idempotency-key");
    if (!checkoutKey || !/^[a-f0-9-]{36}$/i.test(checkoutKey)) return NextResponse.json({ error: "Please refresh checkout before placing your order." }, { status: 400 });
    // File URLs may change on an upload retry; the rest of the order must stay identical.
    const { bankSlipUrl: _slip, ...intent } = body;
    const checkoutHash = createHash("sha256").update(JSON.stringify(intent)).digest("hex");
    const previous = await prisma.order.findUnique({ where: { checkoutKey } });
    if (previous) {
      if (previous.checkoutHash !== checkoutHash) return NextResponse.json({ error: "Order details changed. Please start a new checkout attempt." }, { status: 409 });
      return NextResponse.json({ ok: true, orderNumber: previous.orderNumber, orderId: previous.id, total: previous.total, eventId: "purchase:" + previous.orderNumber });
    }
    if (body.paymentMethod === "bank" && !body.bankSlipUrl) {
      return NextResponse.json({ error: "Bank slip is required for bank deposit" }, { status: 400 });
    }
    // Reject slip URLs that don't point at our own storage (anti-phishing)
    if (body.bankSlipUrl && !isAllowedSlipUrl(body.bankSlipUrl)) {
      return NextResponse.json({ error: "Invalid bank slip reference" }, { status: 400 });
    }

    const user = await getCurrentUser();

    const sid = (await getOrCreateSessionId());
    if (body.bankSlipUrl) {
      const slipId = body.bankSlipUrl.split("/").pop()!.split(".")[0];
      const slip = await prisma.bankSlip.findUnique({ where: { id: slipId }, select: { sessionId: true } });
      if (!slip || slip.sessionId !== sid) return NextResponse.json({ error: "Please upload your bank slip again." }, { status: 400 });
    }
    const settings = await loadCheckoutSettings();
    const result = await prisma.$transaction(async db => {
    // Serialize same-key requests across instances before looking up the order.
    await db.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', checkoutKey);
    await db.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', "customer:" + (user?.id || body.phone));
    const existing = await db.order.findUnique({ where: { checkoutKey } });
    if (existing) {
      if (existing.checkoutHash !== checkoutHash) throw new Error("Order details changed. Please refresh checkout.");
      return existing;
    }
    const { subtotal, accountDiscount, tierDiscount, couponDiscount, couponCode, fee, total, items } =
      await calculateCheckoutQuote(body, user, settings, db);
    if (body.expectedTotal != null && Math.abs(body.expectedTotal - total) > 0.01)
      throw Object.assign(new Error("Order details changed. Please review the updated total before placing your order."), { publicCode: "TOTAL_CHANGED" });
    // Upsert customer for non-logged-in customers
    let customerId: number | null = null;
    if (!user && body.phone) {
      const customer = await db.customer.findFirst({ where: { phone: body.phone } }) ||
        await db.customer.create({ data: { fullName: body.fullName, email: body.email || null, phone: body.phone } });
      customerId = customer.id;
    }



    const order = await db.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        checkoutKey,
        checkoutHash,
        customerId,
        userId: user?.id ?? null,
        fullName: body.fullName,
        phone: body.phone,
        phone2: body.phone2 || null,
        email: body.email || null,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2 || null,
        districtName: body.districtName,
        cityName: body.cityName,
        notes: body.notes || null,
        subtotal,
        accountDiscount,
        tierDiscount,
        couponCode: couponCode || null,
        couponDiscount,
        deliveryFee: fee,
        total,
        paymentMethod: body.paymentMethod,
        bankSlipUrl: body.bankSlipUrl || null,
        status: "pending",
        sessionId: sid,
        source: null,
        items: { create: items }
      }
    });

    if (couponCode) {
      await db.coupon.update({ where: { code: couponCode }, data: { usedCount: { increment: 1 } } });
    }
    const context = JSON.stringify({ externalId: sid, fbp: req.cookies.get("_fbp")?.value,
      fbc: req.cookies.get("_fbc")?.value, clientIp: clientIp(req), userAgent: req.headers.get("user-agent") });
    await db.orderJob.createMany({ data: [
      { orderId: order.id, kind: "sms" },
      { orderId: order.id, kind: "analytics" },
      ...(user ? [{ orderId: order.id, kind: "attribution" }] : []),
      ...(process.env.META_CAPI_ACCESS_TOKEN ? [{ orderId: order.id, kind: "meta", context }] : []),
    ] });
    return order;
    }, { maxWait: 10000, timeout: 20000 });

    // Durable jobs already exist; a worker failure cannot change checkout success.
    void drainOrderJobs(result.id).catch(() => {});
    if (user?.id) {
      void prisma.user.update({ where: { id: user.id }, data: {
        email: body.email || user.email, addressLine1: body.addressLine1,
        addressLine2: body.addressLine2 || null, districtName: body.districtName,
      } }).catch(() => {});
    }
    return NextResponse.json({ ok: true, orderNumber: result.orderNumber, orderId: result.id, total: result.total, eventId: "purchase:" + result.orderNumber });
  } catch (e: any) {
    if (e.publicCode === "TOTAL_CHANGED") return NextResponse.json({ error: e.message, code: e.publicCode }, { status: 409 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues[0]?.message || "Please check your order details." }, { status: 400 });
    const expected = typeof e?.message === "string" && /^(This product|A selected option|Please select|Some products|Coupon|You have|Minimum order|Order details)/.test(e.message);
    console.error("[checkout] request failed", e?.code || e?.name || "unknown");
    return NextResponse.json({ error: expected ? e.message : "We could not complete this request. Please retry; an already received order will not be duplicated." }, { status: expected ? 400 : 503 });
  }
}
