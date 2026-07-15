"use client";
import { useState } from "react";
import { pixelTrack } from "@/lib/pixel";

/**
 * "Leave your number" letterpress lead form for a machine page.
 *
 * On submit:
 *  1) Fires a deduped Meta "Lead" (browser pixel + CAPI) with the hashed phone/
 *     name — a measurable ad conversion, good for match quality.
 *  2) Stores the lead server-side so the shop can actually call the person back.
 * Purely enquiry — no cart, no payment.
 */
export default function MachineLeadForm({
  machineId,
  modelNumber,
  brand,
}: {
  machineId: number;
  modelNumber: string;
  brand: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (!name.trim() || phone.replace(/\D/g, "").length < 9) {
      setError("Please enter your name and a valid phone number.");
      return;
    }
    setBusy(true);
    try {
      // Deduped Meta Lead (browser + CAPI). Phone/name hashed server-side.
      pixelTrack(
        "Lead",
        {
          content_name: "MachineLeadForm",
          source: "machine_lead_form",
          content_ids: [`MACHINE-${machineId}`],
          content_type: "product",
          model_number: modelNumber,
        },
        { userData: { phone: phone.trim(), fullName: name.trim() } }
      );

      const res = await fetch("/api/machines/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), message: msg.trim(), machineId, modelNumber }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data?.error || "Something went wrong.");
      setSent(true);
    } catch (e: any) {
      setError(e?.message || "Could not send — please call us instead.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-[300px] flex flex-col justify-center gap-3">
        <span className="font-display italic font-light text-4xl text-[#B9741F]">Noted.</span>
        <div className="font-display text-2xl font-medium">We&apos;ll call you within the hour.</div>
        <p className="text-[15px] font-semibold text-[#6E6459] max-w-[42ch] leading-relaxed">
          Keep your phone nearby — the call comes from our Colombo line.
        </p>
      </div>
    );
  }

  const labelCls = "flex flex-col gap-2 text-[11.5px] font-extrabold tracking-[.18em] uppercase text-[#8A7E6E]";
  const inputCls =
    "min-h-[46px] border-0 border-b-[1.5px] border-[#D8CBB4] bg-transparent font-display text-xl text-[#1D1A16] outline-none pb-2 transition-colors focus:border-[#E0973F]";

  return (
    <div className="flex flex-col gap-[22px] pt-1.5">
      <label className={labelCls}>
        Your name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="W. Perera" className={inputCls} />
      </label>
      <label className={labelCls}>
        Phone number
        <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="07X XXX XXXX" className={inputCls} />
      </label>
      <label className={labelCls}>
        Anything we should know <span className="normal-case tracking-normal font-semibold text-[#A99D8C]">(optional)</span>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} placeholder="Delivery to Kandy, needed before end of month…"
          className="border-0 border-b-[1.5px] border-[#D8CBB4] bg-transparent font-display text-lg text-[#1D1A16] outline-none resize-y pb-2 transition-colors focus:border-[#E0973F]" />
      </label>

      {error && <p className="text-sm font-semibold text-[#9D3B2F]">{error}</p>}

      <button
        onClick={submit}
        disabled={busy}
        className="self-start inline-flex items-center gap-3.5 min-h-[56px] px-7 bg-[#E0973F] text-[#1D1A16] rounded-[2px] font-sans text-[15.5px] font-extrabold disabled:opacity-60 transition-transform transition-shadow duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1D1A16]"
      >
        {busy ? "Sending…" : <>Request price &amp; availability <span className="font-display italic font-light text-[19px]">→</span></>}
      </button>
      <p className="text-xs font-semibold text-[#8A7E6E]">
        One call, no spam. We&apos;ll share today&apos;s best price for the {brand} {modelNumber}.
      </p>
    </div>
  );
}
