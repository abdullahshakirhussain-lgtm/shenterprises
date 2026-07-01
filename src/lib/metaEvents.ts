/**
 * Meta Conversions API (server-side) — the single reusable event sender.
 *
 * Design goals:
 *  - Deduplication: the SAME event_id used by the browser Pixel is passed here,
 *    so Meta matches on (event_name + event_id) and counts the event once.
 *  - Privacy: email / phone / name are SHA-256 hashed here, server-side only.
 *    Raw PII never leaves our server. The CAPI token is server-only.
 *  - Future-ready: action_source is a parameter. It's "website" today; a future
 *    WhatsApp Cloud API webhook will call this exact function with
 *    action_source "business_messaging" and a ctwa_clid — no refactor needed.
 *  - Safe: a failed event is logged, never thrown into a page render.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import crypto from "crypto";

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v21.0";
// Server-side pixel id — falls back to the public one so we only need to set one.
const PIXEL_ID = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN || "";
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || "";

export type MetaActionSource =
  | "website"
  | "business_messaging" // WhatsApp / Messenger (future webhook)
  | "app"
  | "phone_call"
  | "chat"
  | "email"
  | "other";

export type MetaUserData = {
  email?: string | null;
  phone?: string | null;         // any format — normalised + hashed here
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;      // split into first/last if firstName/lastName absent
  // Non-hashed match signals:
  fbp?: string | null;           // _fbp cookie
  fbc?: string | null;           // _fbc cookie
  clientIp?: string | null;
  userAgent?: string | null;
  ctwaClid?: string | null;      // click-to-WhatsApp id — future business_messaging only
  externalId?: string | null;    // e.g. our user id (hashed)
};

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/** Normalise then hash. Returns undefined for empty values so we omit the key. */
function hashNorm(value: string | null | undefined, kind: "email" | "phone" | "name" | "raw"): string | undefined {
  if (!value) return undefined;
  let v = String(value).trim().toLowerCase();
  if (kind === "phone") {
    // E.164 without "+": digits only. SL local 0XXXXXXXXX -> 94XXXXXXXXX.
    let d = v.replace(/\D/g, "");
    if (d.startsWith("0")) d = "94" + d.slice(1);
    else if (d.length === 9) d = "94" + d;
    v = d;
  }
  if (!v) return undefined;
  return sha256(v);
}

function buildUserData(u: MetaUserData): Record<string, any> {
  let first = u.firstName || null;
  let last = u.lastName || null;
  if (!first && !last && u.fullName) {
    const parts = u.fullName.trim().split(/\s+/);
    first = parts[0] || null;
    last = parts.length > 1 ? parts.slice(1).join(" ") : null;
  }

  const out: Record<string, any> = {};
  const em = hashNorm(u.email, "email");        if (em) out.em = [em];
  const ph = hashNorm(u.phone, "phone");        if (ph) out.ph = [ph];
  const fn = hashNorm(first, "name");           if (fn) out.fn = [fn];
  const ln = hashNorm(last, "name");            if (ln) out.ln = [ln];
  const ext = hashNorm(u.externalId, "raw");    if (ext) out.external_id = [ext];

  // These are NOT hashed by Meta's spec:
  if (u.fbp) out.fbp = u.fbp;
  if (u.fbc) out.fbc = u.fbc;
  if (u.clientIp) out.client_ip_address = u.clientIp;
  if (u.userAgent) out.client_user_agent = u.userAgent;
  if (u.ctwaClid) out.ctwa_clid = u.ctwaClid;

  return out;
}

export type SendMetaEventArgs = {
  event_name: string;
  event_id: string;                 // MUST match the browser Pixel's eventID for dedup
  event_source_url?: string;
  action_source?: MetaActionSource; // defaults to "website"
  user_data?: MetaUserData;
  custom_data?: Record<string, any>;
  event_time?: number;              // unix seconds; defaults to now
  test_event_code?: string;         // overrides env for one-off validation
};

/**
 * Send one event to the Conversions API. Never throws — returns { ok }.
 */
export async function sendMetaEvent(args: SendMetaEventArgs): Promise<{ ok: boolean; error?: string }> {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    // Not configured — silently skip so the site works without Meta set up.
    return { ok: false, error: "Meta CAPI not configured" };
  }

  try {
    const payload: Record<string, any> = {
      data: [
        {
          event_name: args.event_name,
          event_time: args.event_time ?? Math.floor(Date.now() / 1000),
          event_id: args.event_id,
          action_source: args.action_source || "website",
          ...(args.event_source_url ? { event_source_url: args.event_source_url } : {}),
          user_data: buildUserData(args.user_data || {}),
          ...(args.custom_data ? { custom_data: args.custom_data } : {}),
        },
      ],
    };

    const testCode = args.test_event_code || TEST_EVENT_CODE;
    if (testCode) payload.test_event_code = testCode;

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // don't let a slow Graph API hang a request
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[meta-capi] non-200:", res.status, text.slice(0, 300));
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    console.warn("[meta-capi] send failed:", e?.message);
    return { ok: false, error: e?.message };
  }
}

/* ===================================================================
 * FUTURE — WhatsApp / Click-to-WhatsApp Purchase attribution.
 *
 * This is intentionally NOT wired. When you build the WhatsApp Cloud API
 * webhook that confirms an order placed over chat, it will call sendMetaEvent
 * exactly like this. The ctwa_clid arrives in the WhatsApp webhook payload
 * (referral.ctwa_clid) — it never reaches this website, so we don't try to
 * capture it here.
 *
 *   await sendMetaEvent({
 *     event_name: "Purchase",
 *     event_id: `wa-${orderId}`,               // stable id -> dedupe if resent
 *     action_source: "business_messaging",     // <-- the only real difference
 *     user_data: {
 *       phone: customerWhatsAppNumber,          // hashed here automatically
 *       ctwa_clid: referral.ctwa_clid,          // from the WA webhook
 *     },
 *     custom_data: {
 *       currency: "LKR",
 *       value: orderTotal,
 *       content_ids: orderSkus,
 *       content_type: "product",
 *     },
 *   });
 * =================================================================== */
