import { NextResponse } from "next/server";
import { SRI_LANKAN_DISTRICTS } from "@/lib/sriLankaDistricts";

export const dynamic = "force-dynamic";

/**
 * Returns the static list of Sri Lanka's 25 districts with their flat delivery fee.
 * No DB hit, no city granularity — flat rate per district.
 */
export async function GET() {
  return NextResponse.json(
    SRI_LANKAN_DISTRICTS.map((d) => ({
      name: d.name,
      province: d.province,
      deliveryFee: d.deliveryFee,
      // Kept for backwards compatibility — checkout UI no longer renders city dropdown
      cities: [],
    }))
  );
}
