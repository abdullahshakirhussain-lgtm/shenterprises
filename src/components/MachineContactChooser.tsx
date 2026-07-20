"use client";
import { useEffect, useRef, useState } from "react";

/**
 * One combined "Call or WhatsApp" button. On click it asks the visitor which
 * they'd prefer, then hands off to tel: or wa.me. Keeps the homepage machines
 * strip to a single contact action instead of two separate buttons.
 */
export default function MachineContactChooser({
  phone, phoneDisplay,
}: { phone: string; phoneDisplay: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function onEsc(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) { document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onEsc); }
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onEsc); };
  }, [open]);

  const tel = phone ? `tel:+${phone}` : "tel:";
  const wa = `${phone ? `https://wa.me/${phone}` : "https://wa.me/"}?text=${encodeURIComponent("Hi, I'm interested in your industrial machines. Please share prices.")}`;

  function log(method: string) {
    fetch("/api/analytics", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "machine_contact", meta: { source: "home_showcase", method } }),
    }).catch(() => {});
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-xl bg-[#1F9D55] hover:bg-[#1b8b4b] text-white font-bold px-5 py-3 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z" /></svg>
        Call or WhatsApp
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-60 rounded-xl bg-white text-ink shadow-xl border border-black/10 p-2">
          <p className="px-2 pt-1 pb-2 text-xs font-semibold text-ink-mute">How would you like to reach us?</p>
          <a
            href={tel}
            onClick={() => log("call")}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 hover:bg-saffron-50 font-semibold text-sm"
          >
            <span className="grid place-items-center w-8 h-8 rounded-full bg-ink text-cream shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z" /></svg>
            </span>
            <span>Call{phoneDisplay ? <span className="block text-xs font-normal text-ink-mute">{phoneDisplay}</span> : null}</span>
          </a>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => log("whatsapp")}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 hover:bg-saffron-50 font-semibold text-sm"
          >
            <span className="grid place-items-center w-8 h-8 rounded-full bg-[#1F9D55] text-white shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.4-.7-2.9-1.1-4.7-4-4.8-4.2-.2-.2-1.2-1.5-1.2-2.9s.7-2 1-2.3c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.4l.9 2.1c.1.2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.4 2.5 1.5.3.2.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .7-.2 1.3z" /></svg>
            </span>
            <span>WhatsApp<span className="block text-xs font-normal text-ink-mute">Chat now</span></span>
          </a>
        </div>
      )}
    </div>
  );
}
