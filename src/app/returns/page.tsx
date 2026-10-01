import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Returns & refunds",
  description: "How returns, exchanges and refunds work at SH Enterprises.",
  alternates: { canonical: "/returns" },
};

export default function ReturnsPage() {
  return (
    <PolicyPage eyebrow="Help" title="Returns & refunds" updated="October 2026">
      <section>
        <h2>Damaged, faulty or wrong items</h2>
        <p>If something arrives damaged, faulty or isn&apos;t what you ordered, contact us within 7 days of delivery with your order number and a photo. We&apos;ll replace it or refund you — including the delivery fee — at no cost to you.</p>
      </section>
      <section>
        <h2>Changed your mind</h2>
        <p>Unused items in their original packaging can be returned within 7 days of delivery. Return delivery is paid by you, and the original delivery fee is not refunded.</p>
        <p className="mt-2">For hygiene and quality reasons we can&apos;t take back items that have been cut to length, opened from sealed packs, or used.</p>
      </section>
      <section>
        <h2>Refunds</h2>
        <ul>
          <li>Bank deposit orders are refunded to your bank account.</li>
          <li>Cash on delivery orders are refunded by bank transfer to an account you provide.</li>
          <li>Refunds are made within 7 working days of us receiving and checking the returned item.</li>
        </ul>
      </section>
      <section>
        <h2>Industrial machines</h2>
        <p>Machines are covered by their manufacturer warranty, with service by our technicians in Colombo. Warranty terms are confirmed with your quote.</p>
      </section>
      <section>
        <h2>How to start a return</h2>
        <p>Message or call us with your order number (it&apos;s in your confirmation SMS). We&apos;ll confirm the next steps.</p>
      </section>
    </PolicyPage>
  );
}
