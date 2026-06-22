/**
 * SMS abstraction — provider-agnostic.
 * Currently wired for Notify.lk (Sri Lankan SMS gateway).
 * Swapping providers later only requires editing this file.
 *
 * Required env vars (Notify.lk):
 *   NOTIFY_LK_USER_ID
 *   NOTIFY_LK_API_KEY
 *   NOTIFY_LK_SENDER_ID  (e.g. "NotifyDEMO" or your approved sender id)
 */

type SmsResult =
  | { ok: true; provider: string; messageId?: string }
  | { ok: false; provider: string; error: string };

/**
 * Send an SMS to a Sri Lankan number.
 * Phone must be in 94XXXXXXXXX format (no plus, no spaces).
 * Message is the plain-text body.
 */
export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  const userId = process.env.NOTIFY_LK_USER_ID;
  const apiKey = process.env.NOTIFY_LK_API_KEY;
  const senderId = process.env.NOTIFY_LK_SENDER_ID;

  // Dev fallback — log to console if creds aren't set so local development still works
  if (!userId || !apiKey || !senderId) {
    console.log(`[SMS:mock] to=${phone}  ${message}`);
    return { ok: true, provider: "mock" };
  }

  if (!/^94\d{9}$/.test(phone)) {
    return { ok: false, provider: "notify.lk", error: "Phone must be in 94XXXXXXXXX format" };
  }

  try {
    const params = new URLSearchParams({
      user_id: userId,
      api_key: apiKey,
      sender_id: senderId,
      to: phone,
      message,
    });

    const res = await fetch(`https://app.notify.lk/api/v1/send?${params.toString()}`, {
      method: "GET",
      // Notify.lk responds quickly; cap the wait so a hung gateway doesn't block the signup flow
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        provider: "notify.lk",
        error: `HTTP ${res.status}: ${text.slice(0, 200) || res.statusText}`,
      };
    }

    const data: any = await res.json().catch(() => ({}));
    // Notify.lk returns { status: "success" | "error", ... }
    if (data?.status && data.status !== "success") {
      return {
        ok: false,
        provider: "notify.lk",
        error: data.message || data.errors?.[0]?.message || "Notify.lk rejected the request",
      };
    }

    return {
      ok: true,
      provider: "notify.lk",
      messageId: data?.data?.uid || data?.data?.message_id,
    };
  } catch (e: any) {
    return {
      ok: false,
      provider: "notify.lk",
      error: e?.name === "TimeoutError" ? "SMS gateway timed out" : (e?.message || "Network error"),
    };
  }
}
