import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicOrder } from "@/lib/orders";
import OrderReceipt from "@/components/OrderReceipt";

export const dynamic = "force-dynamic";

// Private receipt — never index it.
export function generateMetadata({ params }: { params: { orderNumber: string } }): Metadata {
  return { title: `Order ${params.orderNumber.toUpperCase()}`, robots: { index: false, follow: false } };
}

export default async function OrderPage({ params }: { params: { orderNumber: string } }) {
  const order = await getPublicOrder(params.orderNumber);
  if (!order) notFound();

  return (
    <div className="container-x py-10 sm:py-14">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">✓</div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-saffron-600">Order confirmed</p>
          <h1 className="font-display text-2xl sm:text-3xl text-ink mt-1">Your receipt</h1>
        </div>

        <OrderReceipt order={order} />

        <div className="flex gap-3 justify-center mt-6">
          <Link href={`/track?order=${order.orderNumber}`} className="rounded-xl bg-ink hover:bg-ink-soft text-cream text-sm font-bold px-5 py-2.5 transition-colors">
            Track status
          </Link>
          <Link href="/" className="rounded-xl border-2 border-saffron-300 text-saffron-700 hover:bg-saffron-50 text-sm font-bold px-5 py-2.5 transition-colors">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
