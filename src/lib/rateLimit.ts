/**
 * Lightweight in-memory fixed-window rate limiter.
 *
 * Suitable for a single Railway instance (which is how this app is deployed).
 * Keyed by an arbitrary string (e.g. "login:1.2.3.4" or "otp:94771234567").
 * Counters live in process memory and reset on restart — acceptable for the
 * short windows we use here (abuse mitigation, not billing-grade accounting).
 *
 * Returns { ok, remaining, retryAfterSec }. When ok is false the caller should
 * respond with 429 and the retryAfterSec hint.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map doesn't grow unbounded.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowSec: number
): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  sweep(now);

  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }

  b.count += 1;
  return { ok: true, remaining: limit - b.count, retryAfterSec: 0 };
}

/** Reset a key — call after a SUCCESSFUL login so good users aren't penalised. */
export function rateLimitReset(key: string) {
  buckets.delete(key);
}

/** Best-effort client IP from common proxy headers (Railway sits behind a proxy). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
