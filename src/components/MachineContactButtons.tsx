"use client";
import { pixelTrack } from "@/lib/pixel";

/**
 * Call + WhatsApp CTAs for a machine page. NO cart / checkout — machines are
 * enquiry-only. The WhatsApp message is pre-filled with the model number so the
 * shop knows exactly which machine the customer is asking about.
 *
 * On WhatsApp click we fire the SAME ContactWhatsApp/Lead pixel event + owned
 * analytics log the rest of the site uses, tagged with the model number.
 */
export default function MachineContactButtons({
  phone,            // shop phone in 94XXXXXXXXX (already normalized) or empty
  brand,
  modelNumber,
  machineId,
  machineName,
}: {
  phone: string;
  brand: string;
  modelNumber: string;
  machineId: number;
  machineName: string;
}) {
  const waText = encodeURIComponent(
    `Hi, I'm interested in the ${brand} ${modelNumber} industrial sewing machine. ` +
    `Could you share the price and a demo video?`
  );
  const waHref = phone ? `https://wa.me/${phone}?text=${waText}` : `https://wa.me/?text=${waText}`;
  const telHref = phone ? `tel:+${phone}` : undefined;

  function onWhatsApp() {
    pixelTrack("Lead", {
      content_name: "ContactWhatsApp",
      source: "machine",
      content_ids: [`MACHINE-${machineId}`],
      content_type: "product",
      model_number: modelNumber,
    });
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "whatsapp_click",
        meta: { source: "machine", machineId, modelNumber, name: machineName },
      }),
    }).catch(() => {});
  }

  function onCall() {
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "machine_call",
        meta: { source: "machine", machineId, modelNumber },
      }),
    }).catch(() => {});
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onWhatsApp}
        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#1ebd5b] text-white font-bold px-6 py-4 shadow-md transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.607z"/>
        </svg>
        Enquire &amp; request demo
      </a>
      {telHref && (
        <a
          href={telHref}
          onClick={onCall}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-ink hover:bg-ink-soft text-cream font-bold px-6 py-4 shadow-md transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          Call to order
        </a>
      )}
    </div>
  );
}
