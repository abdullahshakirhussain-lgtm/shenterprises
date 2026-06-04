import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/settings";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberDiscount = await getSetting("account_discount_percent") || "0";
  const tiersRaw = await getSetting("new_customer_tiers") || "[]";

  let tiers: { order: number; percent: number }[] = [];
  try { tiers = JSON.parse(tiersRaw); } catch {}

  return NextResponse.json({ memberDiscount, tiers });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { memberDiscount, tiers } = await req.json();

    if (memberDiscount !== undefined) {
      const val = parseFloat(memberDiscount);
      if (isNaN(val) || val < 0 || val > 100) return NextResponse.json({ error: "Member discount must be 0–100" }, { status: 400 });
      await setSetting("account_discount_percent", String(val));
    }

    if (tiers !== undefined) {
      if (!Array.isArray(tiers)) return NextResponse.json({ error: "Tiers must be an array" }, { status: 400 });
      for (const t of tiers) {
        if (typeof t.order !== "number" || typeof t.percent !== "number" || t.percent < 0 || t.percent > 100) {
          return NextResponse.json({ error: "Each tier needs order (number) and percent (0–100)" }, { status: 400 });
        }
      }
      // Sort and deduplicate by order number
      const deduped = Object.values(
        Object.fromEntries(tiers.map((t: any) => [t.order, { order: Number(t.order), percent: Number(t.percent) }]))
      ).sort((a: any, b: any) => a.order - b.order);
      await setSetting("new_customer_tiers", JSON.stringify(deduped));
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
