import { formatLKR } from "@/lib/utils";
import type { PublicOrder } from "@/lib/orders";

/**
 * Itemised receipt card — shared by /checkout/success and /order/[orderNumber].
 * Server component, print-friendly. Only renders discount lines that apply.
 */

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", paid: "Paid", processing: "Processing",
  shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
};

export default function OrderReceipt({ order }: { order: PublicOrder }) {
  const placed = new Date(order.createdAt).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const payment = order.paymentMethod === "cod" ? "Cash on delivery" : "Bank deposit";
  const cancelled = order.status === "cancelled";

  return (
    <div className="rounded-2xl bg-white border border-saffron-200/60 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 sm:px-6 py-4 border-b border-brand-100 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono font-bold text-ink text-lg">{order.orderNumber}</p>
          <p className="text-xs text-brand-500 mt-0.5">Placed {placed}</p>
        </div>
        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
          cancelled ? "bg-red-100 text-red-700" : "bg-saffron-100 text-saffron-800"
        }`}>
          {STATUS_LABEL[order.status] || order.status}
        </span>
      </div>

      {/* Items */}
      <div className="px-5 sm:px-6 py-4 space-y-2.5">
        {order.items.map((it, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink">
              {it.name} <span className="text-brand-500">× {it.quantity}</span>
            </span>
            <span className="font-semibold text-ink tabular-nums whitespace-nowrap">{formatLKR(it.price * it.quantity)}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="px-5 sm:px-6 py-4 border-t border-brand-100 text-sm space-y-1.5">
        <Row label="Subtotal" value={formatLKR(order.subtotal)} />
        {order.accountDiscount > 0 && <Row label="Member discount" value={`−${formatLKR(order.accountDiscount)}`} green />}
        {order.tierDiscount > 0 && <Row label="New-customer discount" value={`−${formatLKR(order.tierDiscount)}`} green />}
        {order.couponDiscount > 0 && <Row label="Coupon" value={`−${formatLKR(order.couponDiscount)}`} green />}
        <Row label="Delivery" value={order.deliveryFee === 0 ? "Free" : formatLKR(order.deliveryFee)} />
        <div className="flex items-baseline justify-between gap-3 pt-2 mt-1 border-t border-brand-100">
          <span className="font-display font-semibold text-base text-ink">Total</span>
          <span className="font-display font-bold text-lg text-ink tabular-nums">{formatLKR(order.total)}</span>
        </div>
        <p className="text-xs text-brand-500 pt-1">{payment}</p>
      </div>

      {/* Delivery */}
      <div className="px-5 sm:px-6 py-4 border-t border-brand-100 text-sm text-brand-700">
        <span className="text-brand-500">Deliver to:</span>{" "}
        <span className="font-medium text-ink">{order.fullName}</span> · {order.cityName}, {order.districtName}
        {order.phone && <span className="text-brand-400"> · {order.phone}</span>}
      </div>
    </div>
  );
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${green ? "text-green-700" : "text-ink"}`}>
      <span className={green ? "" : "text-brand-600"}>{label}</span>
      <span className="tabular-nums whitespace-nowrap">{value}</span>
    </div>
  );
}
