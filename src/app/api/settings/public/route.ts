import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

// Skip static prerendering — this route makes a DB query and would otherwise
// exhaust the Supabase pooler's 15-connection limit during the build.
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getSettings([
    "bank_name", "bank_account_name", "bank_account_number", "bank_branch",
    "account_discount_percent", "new_customer_tiers"
  ]);
  return NextResponse.json(data);
}
