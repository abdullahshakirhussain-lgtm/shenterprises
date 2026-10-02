import type { Metadata } from "next";
import Link from "next/link";
import { findReviewOrder } from "@/lib/reviewRequests";
import OrderReviewForm from "./OrderReviewForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Rate your order", robots: { index: false, follow: false } };

// Landing page for the review-request SMS — no login needed; the link code
// identifies the order (see lib/reviewRequests.ts).
export default async function ReviewOrderPage(props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params;
  const order = await findReviewOrder(code);

  if (!order || order.items.length === 0) {
    return (
      <Notice title="This link has expired" body="Review links last 60 days. Thanks for shopping with us!" />
    );
  }
  if (order.alreadyReviewed) {
    return <Notice title="Thanks — you've already reviewed this order" body="Your reviews are on the product pages." />;
  }
  return (
    <div className="container-x py-10 sm:py-14">
      <div className="max-w-xl mx-auto">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-saffron-600">Order {order.orderNumber}</p>
        <h1 className="font-display text-3xl text-ink mt-1">How was your order, {order.fullName.split(" ")[0]}?</h1>
        <p className="text-ink-mute mt-2">Tap the stars for anything you&apos;d like to rate. A few words help other tailors and crafters choose.</p>
        <OrderReviewForm code={code} items={order.items} />
      </div>
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="container-x py-14">
      <div className="max-w-md mx-auto card p-7 text-center">
        <h1 className="font-display text-2xl text-ink">{title}</h1>
        <p className="text-sm text-ink-mute mt-2">{body}</p>
        <Link href="/shop" className="inline-block mt-5 rounded-xl bg-ink text-cream text-sm font-bold px-5 py-3">Continue shopping</Link>
      </div>
    </div>
  );
}
