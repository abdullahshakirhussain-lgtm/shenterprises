import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What information SH Enterprises collects, why, and who it is shared with.",
  alternates: { canonical: "/privacy" },
};

// Written from what the site actually does — update this page if that changes.
export default function PrivacyPage() {
  return (
    <PolicyPage eyebrow="Legal" title="Privacy policy" updated="October 2026">
      <section>
        <h2>What we collect</h2>
        <ul>
          <li><strong>When you order:</strong> your name, phone number (and optional second number), email if given, delivery address and any notes. Bank deposit slips you upload are stored privately and only our staff can view them.</li>
          <li><strong>If you create an account:</strong> your name, phone number and a securely hashed password (we can&apos;t see your password).</li>
          <li><strong>When you browse:</strong> pages and products viewed and items added to your cart, linked to a random identifier stored in a cookie on your device.</li>
        </ul>
      </section>
      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To process, deliver and support your orders, including sending order updates by SMS.</li>
          <li>To verify your phone number when you sign up or reset your password.</li>
          <li>To understand which products people are interested in and improve the shop.</li>
          <li>To measure our Facebook / Instagram advertising.</li>
        </ul>
      </section>
      <section>
        <h2>Who we share it with</h2>
        <ul>
          <li><strong>Courier partners</strong> — your name, phone and address, to deliver your order.</li>
          <li><strong>Notify.lk</strong> — your phone number, to send SMS messages.</li>
          <li><strong>Meta (Facebook / Instagram)</strong> — page activity and, when you buy, order details with your contact information, to measure our ads.</li>
          <li><strong>Google</strong> — searches typed in Sinhala or Tamil are sent to Google Translate so we can find matching products.</li>
        </ul>
        <p className="mt-2">We don&apos;t sell your information.</p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>You can ask us to see, correct or delete the information we hold about you by contacting us with the phone number you used. You can also clear cookies in your browser at any time.</p>
      </section>
    </PolicyPage>
  );
}
