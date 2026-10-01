export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatLKR(n: number) {
  // Whole rupees read cleaner without ".00"; real cents still show (Rs. 12.50).
  const whole = Math.abs(n - Math.round(n)) < 0.005;
  return "Rs. " + n.toLocaleString("en-LK", whole ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateOrderNumber() {
  // Keep the date prefix for human readability, but use a cryptographically
  // random 8-char suffix (~2.8e12 combinations) so order numbers can't be
  // guessed/enumerated to harvest customer PII via the tracking endpoint.
  const ts = Date.now().toString(36).toUpperCase();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let rand = "";
  // crypto is available in both Node and edge runtimes
  const bytes = (globalThis.crypto || require("crypto").webcrypto).getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) rand += alphabet[bytes[i] % alphabet.length];
  return `SH-${ts}-${rand}`;
}

export function safeJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

/** A post-login redirect target from ?next=, limited to paths on this site (never an external URL). */
export function safeNextPath(next: string | null | undefined, fallback = "/account") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

/** "25 pieces", "1 yard" — or null for a single piece, where a unit label adds nothing. */
export function unitLabel(qty: number | null | undefined, type: string | null | undefined): string | null {
  if (!qty || !type) return null;
  if (qty === 1) return /^(pieces?|pcs?)$/i.test(type.trim()) ? null : `1 ${type.replace(/s$/i, "")}`;
  return `${qty} ${type}`;
}
