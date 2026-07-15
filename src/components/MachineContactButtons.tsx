"use client";
import { pixelTrack } from "@/lib/pixel";

/**
 * Call + WhatsApp CTAs for a machine detail page, in the editorial "letterpress"
 * style. NO cart / checkout — machines are enquiry-only. Renders BOTH the price-
 * band button column and the sticky mobile contact bar so all click tracking
 * lives in one place.
 *
 * On WhatsApp click we fire the deduped ContactWhatsApp/Lead pixel event + owned
 * analytics, tagged with the model number. The WhatsApp message is pre-filled.
 */
export default function MachineContactButtons({
  phone,            // shop phone in 94XXXXXXXXX (already normalized) or empty
  phoneDisplay,     // human-readable, e.g. "077 235 8900"
  brand,
  modelNumber,
  machineId,
  machineName,
}: {
  phone: string;
  phoneDisplay: string;
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
  const callLabel = phoneDisplay || "Call us";

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
      body: JSON.stringify({ type: "whatsapp_click", meta: { source: "machine", machineId, modelNumber, name: machineName } }),
    }).catch(() => {});
  }

  function onCall() {
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "machine_call", meta: { source: "machine", machineId, modelNumber } }),
    }).catch(() => {});
  }

  const arrow = <span className="font-display italic font-light text-[19px]">→</span>;

  return (
    <>
      {/* Price-band button column */}
      <div className="flex flex-col gap-2.5">
        {telHref && (
          <a
            href={telHref}
            onClick={onCall}
            className="flex items-center justify-between gap-3 min-h-[58px] px-6 bg-[#1D1A16] text-[#FAF7F2] font-extrabold text-base rounded-[2px] transition-transform transition-shadow duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#E0973F]"
          >
            Call {callLabel} {arrow}
          </a>
        )}
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onWhatsApp}
          className="flex items-center justify-between gap-3 min-h-[58px] px-6 bg-transparent border-[1.5px] border-[#1D1A16] text-[#1D1A16] font-extrabold text-base rounded-[2px] transition-transform transition-shadow duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1F9D55]"
        >
          WhatsApp us {arrow}
        </a>
        <a href="#lead-form" className="self-start mt-1.5 text-sm font-extrabold text-[#B9741F] border-b-[1.5px] border-dashed border-[#D8A45C] pb-0.5 hover:text-[#96590E]">
          or leave your number — we call back within the hour
        </a>
        <span className="flex items-center gap-2 text-[13px] font-semibold text-[#6E6459] mt-1">
          <span className="w-2 h-2 rounded-full bg-[#1F9D55] animate-pulse" />
          Open now · Mon–Sat, 9.00–18.00
        </span>
      </div>

      {/* Sticky mobile contact bar */}
      <div className="md:hidden fixed left-0 right-0 bottom-0 z-[60] bg-white/95 backdrop-blur border-t border-[#E4DAC8] px-3 pt-2.5 grid grid-cols-[1fr_1fr_1.2fr] gap-2"
        style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
      >
        {telHref && (
          <a href={telHref} onClick={onCall} className="flex items-center justify-center min-h-[48px] bg-[#1D1A16] text-[#FAF7F2] font-extrabold text-sm rounded-[2px]">Call</a>
        )}
        <a href={waHref} target="_blank" rel="noopener noreferrer" onClick={onWhatsApp} className="flex items-center justify-center min-h-[48px] bg-[#1F9D55] text-white font-extrabold text-sm rounded-[2px]">WhatsApp</a>
        <a href="#lead-form" className="flex items-center justify-center min-h-[48px] bg-[#E0973F] text-[#1D1A16] font-extrabold text-sm rounded-[2px]">Get price</a>
      </div>
    </>
  );
}
