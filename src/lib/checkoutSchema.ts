import { z } from "zod";
import { isValidDistrict } from "./sriLankaDistricts";
const LOCAL_PHONE = /^0\d{9}$/;
export const checkoutSchema = z.object({
  expectedTotal: z.number().finite().nonnegative().optional(),
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().regex(LOCAL_PHONE, "Enter a valid 10-digit phone number starting with 0"),
  phone2: z.string().regex(LOCAL_PHONE, "Second phone must be a 10-digit number starting with 0").optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  addressLine1: z.string().trim().min(1).max(500),
  addressLine2: z.string().optional(),
  districtName: z.string().refine(isValidDistrict, "Please select a valid district"),
  cityName: z.string().min(1),
  notes: z.string().max(2000).optional(),
  paymentMethod: z.enum(["cod", "bank"]),
  bankSlipUrl: z.string().optional(),
  couponCode: z.string().optional(),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(10000),
    variantLabel: z.string().max(200).optional(),  // e.g. "Black, 1/2 inch, 144 yards"
    variantIds: z.array(z.number().int().positive()).max(10).optional(),  // selected variant IDs — used for server-side price lookup
  })).min(1).max(200)
});
