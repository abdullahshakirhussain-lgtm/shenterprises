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
