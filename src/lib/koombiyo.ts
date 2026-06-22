// Flat-rate delivery calculator for Sri Lanka.
// Colombo + Gampaha = Rs. 400. All other districts = Rs. 500.
// Free-shipping threshold (from Settings) still applies if set.

import { getSetting } from "./settings";
import { getDeliveryFee } from "./sriLankaDistricts";

export type DeliveryFeeResult = {
  fee: number;
  source: "flat" | "free";
  freeShippingApplied: boolean;
};

export async function calculateDeliveryFee(
  districtName: string,
  _cityName: string,
  orderSubtotal: number,
  _weightKg = 0.5
): Promise<DeliveryFeeResult> {
  // Free shipping override (admin-configurable threshold)
  const freeThresholdStr = await getSetting("free_delivery_threshold");
  const freeThreshold = freeThresholdStr ? parseFloat(freeThresholdStr) : 0;
  if (freeThreshold > 0 && orderSubtotal >= freeThreshold) {
    return { fee: 0, source: "free", freeShippingApplied: true };
  }

  return { fee: getDeliveryFee(districtName), source: "flat", freeShippingApplied: false };
}
