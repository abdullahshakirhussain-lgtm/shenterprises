// Koombiyo delivery rate calculator.
// Falls back to the per-district fee stored in the database when no API key is set
// or when the API call fails.
import { prisma } from "./prisma";
import { getSetting } from "./settings";

export type DeliveryFeeResult = {
  fee: number;
  source: "city" | "district" | "koombiyo" | "fallback";
  freeShippingApplied: boolean;
};

export async function calculateDeliveryFee(
  districtName: string,
  cityName: string,
  orderSubtotal: number,
  weightKg = 0.5
): Promise<DeliveryFeeResult> {
  const freeThresholdStr = await getSetting("free_delivery_threshold");
  const freeThreshold = freeThresholdStr ? parseFloat(freeThresholdStr) : 0;
  if (freeThreshold > 0 && orderSubtotal >= freeThreshold) {
    return { fee: 0, source: "fallback", freeShippingApplied: true };
  }

  // 1. Try Koombiyo if API key configured
  const apiKey = await getSetting("koombiyo_api_key");
  if (apiKey) {
    try {
      const url = `https://application.koombiyodelivery.lk/api/Deliveryrates/list`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ apikey: apiKey, city: cityName, weight: String(weightKg) }),
        cache: "no-store"
      });
      if (res.ok) {
        const data: any = await res.json();
        const rate = parseFloat(data?.rate ?? data?.delivery_fee ?? data?.price);
        if (!isNaN(rate) && rate > 0) {
          return { fee: rate, source: "koombiyo", freeShippingApplied: false };
        }
      }
    } catch {
      // fall through to local rates
    }
  }

  // 2. City override
  const district = await prisma.district.findUnique({
    where: { name: districtName },
    include: { cities: { where: { name: cityName } } }
  });
  if (!district) return { fee: 500, source: "fallback", freeShippingApplied: false };
  const city = district.cities[0];
  if (city?.deliveryFee != null) {
    return { fee: city.deliveryFee, source: "city", freeShippingApplied: false };
  }
  return { fee: district.deliveryFee, source: "district", freeShippingApplied: false };
}
