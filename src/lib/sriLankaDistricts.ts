/**
 * All 25 districts of Sri Lanka with flat-rate delivery pricing.
 * Colombo + Gampaha = Rs. 400.
 * All other 23 districts = Rs. 500.
 *
 * Source: official administrative districts (9 provinces, 25 districts total).
 */

export type SriLankanDistrict = { name: string; province: string; deliveryFee: number };

export const SRI_LANKAN_DISTRICTS: readonly SriLankanDistrict[] = [
  // Western Province (cheapest — closest to logistics hubs)
  { name: "Colombo",       province: "Western",         deliveryFee: 400 },
  { name: "Gampaha",       province: "Western",         deliveryFee: 400 },
  { name: "Kalutara",      province: "Western",         deliveryFee: 500 },

  // Central
  { name: "Kandy",         province: "Central",         deliveryFee: 500 },
  { name: "Matale",        province: "Central",         deliveryFee: 500 },
  { name: "Nuwara Eliya",  province: "Central",         deliveryFee: 500 },

  // Southern
  { name: "Galle",         province: "Southern",        deliveryFee: 500 },
  { name: "Matara",        province: "Southern",        deliveryFee: 500 },
  { name: "Hambantota",    province: "Southern",        deliveryFee: 500 },

  // Northern
  { name: "Jaffna",        province: "Northern",        deliveryFee: 500 },
  { name: "Kilinochchi",   province: "Northern",        deliveryFee: 500 },
  { name: "Mannar",        province: "Northern",        deliveryFee: 500 },
  { name: "Vavuniya",      province: "Northern",        deliveryFee: 500 },
  { name: "Mullaitivu",    province: "Northern",        deliveryFee: 500 },

  // Eastern
  { name: "Batticaloa",    province: "Eastern",         deliveryFee: 500 },
  { name: "Ampara",        province: "Eastern",         deliveryFee: 500 },
  { name: "Trincomalee",   province: "Eastern",         deliveryFee: 500 },

  // North Western
  { name: "Kurunegala",    province: "North Western",   deliveryFee: 500 },
  { name: "Puttalam",      province: "North Western",   deliveryFee: 500 },

  // North Central
  { name: "Anuradhapura",  province: "North Central",   deliveryFee: 500 },
  { name: "Polonnaruwa",   province: "North Central",   deliveryFee: 500 },

  // Uva
  { name: "Badulla",       province: "Uva",             deliveryFee: 500 },
  { name: "Monaragala",    province: "Uva",             deliveryFee: 500 },

  // Sabaragamuwa
  { name: "Ratnapura",     province: "Sabaragamuwa",    deliveryFee: 500 },
  { name: "Kegalle",       province: "Sabaragamuwa",    deliveryFee: 500 },
] as const;

export function getDeliveryFee(districtName: string): number {
  const d = SRI_LANKAN_DISTRICTS.find(
    (x) => x.name.toLowerCase() === (districtName || "").trim().toLowerCase()
  );
  return d ? d.deliveryFee : 500; // unknown districts default to the higher tier
}

export function isValidDistrict(districtName: string): boolean {
  return SRI_LANKAN_DISTRICTS.some(
    (x) => x.name.toLowerCase() === (districtName || "").trim().toLowerCase()
  );
}
