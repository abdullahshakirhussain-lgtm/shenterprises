import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getOrCreateSessionId } from "@/lib/analytics";
import { rateLimit, clientIp } from "@/lib/rateLimit";
export async function GET(req: NextRequest) {
 if (!rateLimit("meta-identity:" + clientIp(req), 60, 60).ok) return NextResponse.json({}, { status: 429 });
 return NextResponse.json({ external_id: createHash("sha256").update((await getOrCreateSessionId())).digest("hex") }, { headers: { "Cache-Control": "private, no-store" } });
}
