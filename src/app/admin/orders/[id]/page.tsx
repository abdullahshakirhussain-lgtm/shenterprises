import { prisma } from "@/lib/prisma";
import { formatLKR } from "@/lib/utils";
import { notFound } from "next/navigation";
import StatusForm from "./StatusForm";
import WhatsAppButton from "./WhatsAppButton";

export const dynamic = "force-dynamic";

export default async function OrderDetail({ params }: { params: { id: string } }) {
  const o = await prisma.order.findUnique({
    where: { id: parseInt(params.id) },
    include: { items: true }
  });
  if (!o) notFound();
  return (
    <div className="container-x py-6 grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="card p-5">
          <h1 className="font-display text-2xl text-brand-900 mb-2">Order {o.orderNumber}</h1>
          <div className="text-sm text-brand-700">Placed {new Date(o.createdAt).toLocaleString()}</div>
          {o.source && <div className="text-xs text-brand-500 mt-1">Source: {o.source}</div>}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Items</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-brand-600"><th>Product</th><th>Qty</th><th>Price</th><th className="text-right">Subtotal</th></tr></thead>
            <tbody>
              {o.items.map((it) => (
                <tr key={it.id} className="border-t border-brand-100">
                  <td className="py-2">{it.name}</td><td>{it.quantity}</td><td>{formatLKR(it.price)}</td>
                  <td className="text-right">{formatLKR(it.price * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 text-right space-y-1 text-sm">
            <div>Subtotal: <strong>{formatLKR(o.subtotal)}</strong></div>
            {o.accountDiscount > 0 && <div className="text-green-700">Member discount: −{formatLKR(o.accountDiscount)}</div>}
            {o.couponDiscount > 0 && <div className="text-green-700">Coupon {o.couponCode}: −{formatLKR(o.couponDiscount)}</div>}
            <div>Delivery: <strong>{formatLKR(o.deliveryFee)}</strong></div>
            <div className="text-lg">Total: <strong>{formatLKR(o.total)}</strong></div>
          </div>
        </div>
        {o.paymentMethod === "bank" && (
          <div className="card p-5">
            <h2 className="font-semibold mb-2">Bank deposit slip</h2>
            {o.bankSlipUrl ? (
              o.bankSlipUrl.endsWith(".pdf")
                ? <a href={o.bankSlipUrl} target="_blank" className="text-brand-700 underline">Open slip (PDF)</a>
                : <img src={o.bankSlipUrl} alt="slip" className="max-w-md rounded border border-brand-200" />
            ) : <p className="text-sm text-brand-600">No slip uploaded.</p>}
          </div>
        )}
      </div>
      <div className="space-y-4">
        <div className="card p-5">
          <h2 className="font-semibold mb-2">Customer</h2>
          <div className="text-sm">{o.fullName}</div>
          <div className="text-sm">{o.phone}</div>
          {o.email && <div className="text-sm">{o.email}</div>}
          <hr className="my-2" />
          <div className="text-sm">{o.addressLine1}</div>
          {o.addressLine2 && <div className="text-sm">{o.addressLine2}</div>}
          <div className="text-sm">{o.cityName}, {o.districtName}</div>
          {o.notes && <><hr className="my-2" /><div className="text-sm text-brand-700">📝 {o.notes}</div></>}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Status</h2>
          <StatusForm orderId={o.id} current={o.status} />
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-3">WhatsApp Customer</h2>
          <WhatsAppButton
            phone={o.phone}
            customerName={o.fullName}
            orderNumber={o.orderNumber}
            total={o.total}
            status={o.status}
          />
        </div>
      </div>
    </div>
  );
}
