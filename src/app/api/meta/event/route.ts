import { NextRequest, NextResponse } from "next/server";
import { sendMetaEvent, type MetaUserData } from "@/lib/metaEvents";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Browser -> server bridge for the Conversions API.
 *
 * The browser Pixel fires an event with a generated eventID, then calls this
 * endpoint with the SAME eventID. We enrich it with the _fbp / _fbc cookies,
 * client IP, and user agent (things only the server sees reliably) and forward
 * to Meta. Meta dedupes browser + server on (event_name + event_id).
 *
 * Any PII (checkout phone/name) arrives here in the POST body over HTTPS to our
 * OWN origin, and is hashed inside sendMetaEvent before leaving the server.
 */
export async function POST(req: NextRequest) {
  // Light throttle to stop abuse of an unauthenticated endpoint
  const rl = rateLimit(`meta-event:${clientIp(req)}`, 60, 60);
  if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const eventName = String(body?.eventName || "");
  const eventId = String(body?.eventId || "");
  if (!eventName || !eventId) return NextResponse.json({ ok: false }, { status: 400 });

  // Cookies set by the Meta pixel (_fbp) and our fbclid capture (_fbc)
  const fbp = req.cookies.get("_fbp")?.value || null;
  const fbc = req.cookies.get("_fbc")?.value || null;

  const userData: MetaUserData = {
    fbp,
    fbc,
    clientIp: clientIp(req),
    userAgent: req.headers.get("user-agent") || null,
    // Optional PII the caller chose to send (e.g. checkout) — hashed server-side
    email: body?.userData?.email ?? null,
    phone: body?.userData?.phone ?? null,
    fullName: body?.userData?.fullName ?? null,
    externalId: body?.userData?.externalId ?? null,
  };

  const result = await sendMetaEvent({
    event_name: eventName,
    event_id: eventId,
    event_source_url: typeof body?.eventSourceUrl === "string" ? body.eventSourceUrl : undefined,
    action_source: "website",
    user_data: userData,
    custom_data: body?.customData && typeof body.customData === "object" ? body.customData : undefined,
  });

  // TEMPORARY — confirms server CAPI is firing with the matching event_id.
  // Remove once dedup is verified in Meta Test Events.
  console.log(`[meta-capi] ${eventName} id=${eventId} sent=${result.ok}${result.error ? " err=" + result.error : ""}`);

  // Always 200 to the browser — tracking must never surface as a user error
  return NextResponse.json({ ok: result.ok });
}
