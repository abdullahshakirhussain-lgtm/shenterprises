import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Terms of sale",
  description: "Terms for buying from SH Enterprises.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PolicyPage eyebrow="Legal" title="Terms of sale" updated="October 2026">
      <section>
        <h2>Who we are</h2>
        <p>shenterprises.lk is run by SH Enterprises, 218 2/6, 2nd Cross Street, Colombo 11, Sri Lanka.</p>
      </section>
      <section>
        <h2>Prices and orders</h2>
        <ul>
          <li>All prices are in Sri Lankan Rupees (LKR). Delivery fees are shown at checkout before you place your order.</li>
          <li>Placing an order is an offer to buy. We confirm it once we&apos;ve checked stock (and, for bank deposits, received your payment).</li>
          <li>If an item turns out to be unavailable or was listed at a clearly wrong price, we&apos;ll contact you and you can change or cancel the order; anything already paid is refunded.</li>
          <li>Colours may look slightly different on screen from the actual product.</li>
        </ul>
      </section>
      <section>
        <h2>Payment</h2>
        <p>We accept cash on delivery and bank deposit. See <a href="/delivery">Delivery information</a> for details.</p>
      </section>
      <section>
        <h2>Industrial machines</h2>
        <p>Machine prices are quoted individually and confirmed with you before purchase.</p>
      </section>
      <section>
        <h2>Returns</h2>
        <p>See our <a href="/returns">Returns &amp; refunds</a> policy.</p>
      </section>
      <section>
        <h2>Governing law</h2>
        <p>These terms are governed by the laws of Sri Lanka.</p>
      </section>
    </PolicyPage>
  );
}
