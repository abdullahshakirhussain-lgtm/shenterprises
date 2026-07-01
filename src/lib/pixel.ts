/**
 * Meta Pixel (browser) helpers with Conversions API deduplication.
 *
 * Every tracked event gets a single event_id that is sent BOTH via the browser
 * Pixel (as eventID) AND mirrored to /api/meta/event (server CAPI) with the same
 * id. Meta dedupes on (event_name + event_id) so the event counts once with the
 * best of browser + server signal.
 *
 * Safe no-ops when the pixel isn't configured / blocked / SSR.
 * The CAPI access token is NEVER referenced here — it lives server-side only.
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

export const META_PIXEL_ID =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_META_PIXEL_ID || "" : "";

/** Placeholder consent gate. No banner exists yet; returns true.
 *  Wire a real check here if a consent mechanism is added later. */
export function hasConsent(): boolean {
  return true;
}

function newEventId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Read a cookie value in the browser. */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Capture fbclid from the landing URL and persist the _fbc cookie in Meta's
 * required format: fb.1.{unixMs}.{fbclid}. Also keeps any existing _fbc.
 * Call once on app load. Safe to call repeatedly.
 */
export function captureFbclid() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get("fbclid");
    if (!fbclid) return;
    if (readCookie("_fbc")) return; // don't overwrite an existing click id
    const val = `fb.1.${Date.now()}.${fbclid}`;
    // 90-day cookie, site-wide
    document.cookie = `_fbc=${encodeURIComponent(val)}; path=/; max-age=${90 * 24 * 60 * 60}; SameSite=Lax`;
  } catch {
    /* never break the page over analytics */
  }
}

type TrackOptions = {
  /** Optional PII forwarded to our own server endpoint (hashed there, never to Meta raw). */
  userData?: { email?: string | null; phone?: string | null; fullName?: string | null; externalId?: string | null };
  /** Provide your own id (e.g. for a server-fired Purchase that must dedupe). */
  eventId?: string;
};

/**
 * Fire a standard Meta event on BOTH browser pixel and server CAPI (deduped).
 * Returns the event_id used (handy when the server must fire the twin event).
 */
export function pixelTrack(
  event: string,
  params?: Record<string, any>,
  opts?: TrackOptions
): string {
  const eventId = opts?.eventId || newEventId();
  if (typeof window === "undefined") return eventId;
  if (!META_PIXEL_ID) return eventId;   // Meta not configured — don't hit our server either
  if (!hasConsent()) return eventId;

  // 1) Browser pixel (if loaded)
  try {
    if (typeof window.fbq === "function") {
      window.fbq("track", event, params || {}, { eventID: eventId });
    }
  } catch {}

  // 2) Server CAPI mirror with the SAME event_id (fire-and-forget)
  try {
    fetch("/api/meta/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        eventName: event,
        eventId,
        customData: params || {},
        userData: opts?.userData || undefined,
        eventSourceUrl: window.location.href,
      }),
    }).catch(() => {});
  } catch {}

  return eventId;
}
