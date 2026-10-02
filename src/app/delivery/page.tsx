import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";
import { SRI_LANKAN_DISTRICTS } from "@/lib/sriLankaDistricts";
import { getSetting } from "@/lib/settings";
import { formatLKR } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Delivery information",
  description: "Island-wide delivery across Sri Lanka — delivery fees by district, delivery times and payment options.",
  alternates: { canonical: "/delivery" },
};

export default async function DeliveryPage() {
  // Fees and the free-delivery threshold come from the same data checkout uses.
  const threshold = Number((await getSetting("free_delivery_threshold")) || 0);
  const tiers = new Map<number, string[]>();
  for (const d of SRI_LANKAN_DISTRICTS) tiers.set(d.deliveryFee, [...(tiers.get(d.deliveryFee) || []), d.name]);
  const sorted = [...tiers.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <PolicyPage eyebrow="Help" title="Delivery information" updated="October 2026">
      <section>
        <h2>Where we deliver</h2>
        <p>We deliver island-wide, to all 25 districts of Sri Lanka, with cash on delivery available everywhere.</p>
      </section>
      <section>
        <h2>Delivery fees</h2>
        <p>The fee depends on your district and is shown at checkout before you place your order.</p>
        <ul className="mt-2">
          {sorted.map(([fee, names], i) => (
            <li key={fee}><strong>{formatLKR(fee)}</strong> — {i === sorted.length - 1 && sorted.length > 1 ? "all other districts" : names.join(", ")}</li>
          ))}
        </ul>
        {threshold > 0 && <p className="mt-2">Delivery is free on orders of {formatLKR(threshold)} or more.</p>}
      </section>
      <section>
        <h2>How long it takes</h2>
        <p>Orders are dispatched the same day or the next day, and delivered within 3 days. You can follow your order any time on the <a href="/track">Track my order</a> page.</p>
      </section>
      <section>
        <h2>Paying for your order</h2>
        <ul>
          <li><strong>Cash on delivery, island-wide</strong> — pay the courier when your order arrives.</li>
          <li><strong>Bank deposit</strong> — upload your deposit slip at checkout; we dispatch once the payment is confirmed.</li>
        </ul>
      </section>
      <section>
        <h2>Industrial machines</h2>
        <p>Machine delivery and installation are quoted separately by district — ask us when you enquire.</p>
      </section>
    </PolicyPage>
  );
}
