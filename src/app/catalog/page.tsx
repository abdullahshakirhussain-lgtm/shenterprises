import { catalogPage } from "@/lib/catalog";
import { isAvailable } from "@/lib/commerce";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { normalizePhone } from "@/lib/userAuth";
import CatalogClient from "./CatalogClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Quick catalog — SH Enterprises",
  description: "Simple browse-and-WhatsApp catalog for quick orders.",
  robots: { index: false, follow: false }, // hidden from search engines
};

export default async function CatalogPage() {
  const [page, shopPhoneRaw] = await Promise.all([catalogPage(), getSetting("site_phone")]);
  // wa.me requires international format with no + or leading zero (e.g. 94779792906).
  // normalizePhone() handles 077... → 9477..., 0094... → 9477..., +94... → 9477..., etc.
  // If the stored number can't be normalized, fall back to a plain digit strip so the
  // share link at least opens WhatsApp (lets the user pick a contact manually).
  const intlPhone = normalizePhone(String(shopPhoneRaw || ""))
    || String(shopPhoneRaw || "").replace(/\D/g, "");

  return (
    <CatalogClient
      groups={page.groups}
      nextCursor={page.nextCursor}
      shopPhone={intlPhone}
    />
  );
}
