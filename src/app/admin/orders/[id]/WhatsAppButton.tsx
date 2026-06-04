"use client";

const MESSAGES: Record<string, (name: string, order: string, total: string) => string> = {
  pending:    (n, o, t) => `Hi ${n}! 👋 We've received your order *${o}* for LKR ${t}. We'll process it shortly. Thank you for shopping with SH Enterprises! 🧵`,
  paid:       (n, o, t) => `Hi ${n}! ✅ Payment confirmed for order *${o}* (LKR ${t}). We're now preparing your items. – SH Enterprises`,
  processing: (n, o, t) => `Hi ${n}! 📦 Your order *${o}* (LKR ${t}) is being packed and will be handed to the courier soon. – SH Enterprises`,
  shipped:    (n, o, t) => `Hi ${n}! 🚚 Great news! Your order *${o}* (LKR ${t}) is on its way. You can track it at ${typeof window !== "undefined" ? window.location.origin : ""}/track?order=${o} – SH Enterprises`,
  delivered:  (n, o, t) => `Hi ${n}! 🎉 Your order *${o}* has been delivered. Hope you love your purchase! Please leave us a review. – SH Enterprises`,
  cancelled:  (n, o, _) => `Hi ${n}, your order *${o}* has been cancelled. If you have questions, please contact us. – SH Enterprises`,
};

export default function WhatsAppButton({
  phone, customerName, orderNumber, total, status
}: {
  phone: string;
  customerName: string;
  orderNumber: string;
  total: number;
  status: string;
}) {
  const totalStr = total.toLocaleString("en-LK", { minimumFractionDigits: 2 });

  function buildLink(msgKey: string) {
    const fn = MESSAGES[msgKey] || MESSAGES.pending;
    const msg = fn(customerName.split(" ")[0], orderNumber, totalStr);
    // Normalize phone to international format
    const digits = phone.replace(/\D/g, "");
    const intl = digits.startsWith("0") ? "94" + digits.slice(1) : digits;
    return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-brand-600 mb-3">Click a button to open WhatsApp with a pre-filled message for this customer.</p>
      {Object.keys(MESSAGES).map((key) => (
        <a
          key={key}
          href={buildLink(key)}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm font-medium transition border ${
            key === status
              ? "bg-green-500 text-white border-green-500 hover:bg-green-600"
              : "bg-white text-brand-700 border-brand-200 hover:bg-brand-50"
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.12 1.531 5.847L.057 23.882l6.198-1.625A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.802 9.802 0 01-4.994-1.366l-.358-.214-3.68.965.981-3.595-.234-.371A9.818 9.818 0 012.182 12C2.182 6.575 6.575 2.182 12 2.182S21.818 6.575 21.818 12 17.425 21.818 12 21.818z"/></svg>
          <span className="capitalize">{key} message</span>
          {key === status && <span className="ml-auto text-xs opacity-75">current status</span>}
        </a>
      ))}
    </div>
  );
}
