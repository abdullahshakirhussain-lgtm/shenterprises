export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatLKR(n: number) {
  return "Rs. " + n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
