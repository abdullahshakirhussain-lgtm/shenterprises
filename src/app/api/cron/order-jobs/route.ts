import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { drainOrderJobs } from "@/lib/orderJobs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
 const expected = process.env.CRON_SECRET;
 const supplied = req.headers.get("authorization") || "";
 const valid = expected && Buffer.byteLength(supplied) === Buffer.byteLength("Bearer " + expected) &&
 timingSafeEqual(Buffer.from(supplied), Buffer.from("Bearer " + expected));
 if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 await drainOrderJobs();
 return NextResponse.json({ ok: true });
}
