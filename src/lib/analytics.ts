import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";
import crypto from "crypto";

export const SESSION_COOKIE = "sh_sid";

export function getOrCreateSessionId(): string {
  const jar = cookies();
  const existing = jar.get(SESSION_COOKIE)?.value;
  if (existing) return existing;
  const id = crypto.randomUUID();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/"
  });
  return id;
}

export async function recordEvent(opts: {
  type: string;
  path?: string;
  productId?: number;
  quantity?: number;
  value?: number;
  meta?: any;
}) {
  const sid = getOrCreateSessionId();
  const h = headers();
  const referrer = h.get("referer") || h.get("referrer") || undefined;
  const userAgent = h.get("user-agent") || undefined;
  const url = opts.path ? new URL(opts.path, "http://x") : null;
  const utmSource = url?.searchParams.get("utm_source") || undefined;
  const utmMedium = url?.searchParams.get("utm_medium") || undefined;
  const utmCampaign = url?.searchParams.get("utm_campaign") || undefined;

  await prisma.analyticsSession.upsert({
    where: { id: sid },
    update: { lastSeen: new Date() },
    create: { id: sid, referrer, userAgent, utmSource, utmMedium, utmCampaign, source: utmSource || (referrer ? new URL(referrer).hostname : "direct") }
  });

  await prisma.analyticsEvent.create({
    data: {
      sessionId: sid,
      type: opts.type,
      path: opts.path,
      productId: opts.productId,
      quantity: opts.quantity,
      value: opts.value,
      meta: opts.meta ? JSON.stringify(opts.meta) : null
    }
  });
}

/**
 * Normalise a phone to E.164-without-plus (SL: 0XXXXXXXXX -> 94XXXXXXXXX).
 * Returns null when there aren't enough digits.
 */
function normalizePhoneDigits(phone: string): string | null {
  let d = String(phone).replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("0")) d = "94" + d.slice(1);
  else if (d.length === 9) d = "94" + d;
  return d.length >= 9 ? d : null;
}

/**
 * Link a phone to the current analytics session so past anonymous activity
 * ties to a real (repeat) customer. Stores ONLY a SHA-256 hash (for matching)
 * and the last 4 digits (for eyeball recognition) — never the full number.
 * Best-effort; never throws into the caller.
 */
export async function attachPhoneToSession(sessionId: string, phone: string): Promise<void> {
  try {
    const digits = normalizePhoneDigits(phone);
    if (!digits) return;
    const phoneHash = crypto.createHash("sha256").update(digits).digest("hex");
    const phoneLast4 = digits.slice(-4);
    // Update if the session row exists; create a minimal one if it somehow doesn't.
    await prisma.analyticsSession.upsert({
      where: { id: sessionId },
      update: { phoneHash, phoneLast4, lastSeen: new Date() },
      create: { id: sessionId, phoneHash, phoneLast4, source: "direct" },
    });
  } catch (e: any) {
    console.warn("[analytics] attachPhoneToSession failed:", e?.message);
  }
}
