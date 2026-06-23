import { NextRequest, NextResponse } from "next/server";
import { rebuildAllProfiles } from "@/lib/customerProfile";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron-only endpoint. Protect with a shared CRON_SECRET so random callers
 * can't trigger a rebuild loop.
 *
 * Railway cron config:
 *   * /15 * * * *
 *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://shenterprises.lk/api/cron/rebuild-profiles
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 503 });

  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const result = await rebuildAllProfiles();
  return NextResponse.json({ ...result, elapsedMs: Date.now() - start });
}
