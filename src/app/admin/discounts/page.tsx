import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSetting } from "@/lib/settings";
import DiscountsPanel from "./DiscountsPanel";

export const metadata = { title: "Discounts — SH Admin" };

export default async function DiscountsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const memberDiscount = await getSetting("account_discount_percent") || "0";
  const tiersRaw = await getSetting("new_customer_tiers") || "[]";
  let tiers: { order: number; percent: number }[] = [];
  try { tiers = JSON.parse(tiersRaw); } catch {}

  return (
    <div className="container-x py-8 max-w-3xl">
      <h1 className="font-display text-2xl text-brand-900 mb-6">Discount Management</h1>
      <DiscountsPanel initialMemberDiscount={memberDiscount} initialTiers={tiers} />
    </div>
  );
}
