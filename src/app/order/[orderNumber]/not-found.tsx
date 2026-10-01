import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { normalizePhone } from "@/lib/userAuth";

// Shown (with a 404 status) when an order number doesn't match — usually a
// typo from the SMS — instead of the generic "page not found".
export default async function OrderNotFound() {
  const phone = normalizePhone((await getSetting("site_phone")) || "");
  const wa = phone ? `https://wa.me/${phone}?text=${encodeURIComponent("Hi! I can't find my order. My order number is: ")}` : null;
  return (
    <div className="container-x py-14">
      <div className="max-w-md mx-auto card p-7 text-center">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-saffron-600">Order not found</p>
        <h1 className="font-display text-2xl text-ink mt-2">We couldn&apos;t find that order</h1>
        <p className="text-sm text-ink-mute mt-3">
          Check the order number in your confirmation SMS — it looks like <span className="font-mono text-ink">SH-XXXXXXXX-XXXXXXXX</span>.
          The easiest way is to tap the link in the SMS itself.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Link href="/track" className="rounded-xl bg-ink hover:bg-ink-soft text-cream text-sm font-bold px-5 py-3 transition-colors">Enter the number again</Link>
          {wa && (
            <a href={wa} className="rounded-xl bg-[#1F9D55] hover:bg-[#188247] text-white text-sm font-bold px-5 py-3 transition-colors">Ask us on WhatsApp</a>
          )}
        </div>
      </div>
    </div>
  );
}
