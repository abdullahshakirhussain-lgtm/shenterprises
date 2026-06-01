import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const data = await getSettings([
    "bank_name", "bank_account_name", "bank_account_number", "bank_branch",
    "account_discount_percent"
  ]);
  return NextResponse.json(data);
}
