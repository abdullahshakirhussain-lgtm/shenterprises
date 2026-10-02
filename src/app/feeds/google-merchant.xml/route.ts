import { buildMerchantFeed } from "@/lib/merchantFeed";
import { memo } from "@/lib/memo";

export const dynamic = "force-dynamic";

// Google Merchant Center fetches this on a schedule (set in Merchant Center).
// Cached in memory and rebuilt automatically after any product change.
export async function GET() {
  const xml = await memo("feed:google-merchant", buildMerchantFeed);
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=900" },
  });
}
