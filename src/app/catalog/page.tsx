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
  const [productsRaw, shopPhoneRaw] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: [
        { category: { sortOrder: "asc" } },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        salePrice: true,
        imageUrl: true,
        stock: true,
        unitQty: true,
        unitType: true,
        category: { select: { name: true, slug: true } },
        // Only pack + size variants — colors and lengths are handled by the customer in WhatsApp chat
        variants: {
          where: { type: { in: ["pack", "size"] } },
          select: { id: true, type: true, name: true, price: true, salePrice: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    getSetting("site_phone"),
  ]);

  // Group by category for visual scanning
  const groups = new Map<string, { name: string; slug: string; items: typeof productsRaw }>();
  for (const p of productsRaw) {
    const key = p.category?.slug || "other";
    const name = p.category?.name || "Other";
    if (!groups.has(key)) groups.set(key, { name, slug: key, items: [] });
    groups.get(key)!.items.push(p);
  }

  // wa.me requires international format with no + or leading zero (e.g. 94779792906).
  // normalizePhone() handles 077... → 9477..., 0094... → 9477..., +94... → 9477..., etc.
  // If the stored number can't be normalized, fall back to a plain digit strip so the
  // share link at least opens WhatsApp (lets the user pick a contact manually).
  const intlPhone = normalizePhone(String(shopPhoneRaw || ""))
    || String(shopPhoneRaw || "").replace(/\D/g, "");

  return (
    <CatalogClient
      groups={Array.from(groups.values())}
      shopPhone={intlPhone}
    />
  );
}
