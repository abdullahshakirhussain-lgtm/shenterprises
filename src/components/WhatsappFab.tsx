"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { pixelTrack } from "@/lib/pixel";

/**
 * Small floating WhatsApp icon, bottom-left, that opens a chat with the shop.
 * - Hidden on /catalog (it already ends in a WhatsApp share), /admin, /checkout
 * - Reads site_phone from /api/settings/public, normalizes to 94XXXXXXXXX format
 * - 2-second slide-in delay so it doesn't fight other UI on first load
 */

function normalizeSL(input: string): string | null {
  const digits = (input || "").replace(/\D/g, "");
  if (!digits) return null;
  let n = digits;
  if (n.startsWith("0094")) n = "94" + n.slice(4);
  else if (n.startsWith("94")) n = n;
  else if (n.startsWith("0")) n = "94" + n.slice(1);
  else if (n.length === 9) n = "94" + n;
  if (n.length !== 11 || !n.startsWith("94")) return null;
  return n;
}

export default function WhatsappFab() {
  const pathname = usePathname();
  const [phone, setPhone] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  // Hide on full-takeover routes
  const hide =
    !pathname ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/catalog") ||
    pathname.startsWith("/checkout");

  useEffect(() => {
    if (hide) return;
    fetch("/api/settings/public")
      .then(r => r.json())
      .then(d => setPhone(normalizeSL(String(d?.site_phone || ""))))
      .catch(() => {});
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, [hide]);

  if (hide || !phone) return null;

  const href = `https://wa.me/${phone}?text=${encodeURIComponent("Hi! I have a question about SH Enterprises…")}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      onClick={() => {
        pixelTrack("Lead", { content_name: "ContactWhatsApp", source: "fab" });
        fetch("/api/analytics", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "whatsapp_click", meta: { source: "fab" } }),
        }).catch(() => {});
      }}
      className={`fixed bottom-4 left-4 z-30 group transition-all duration-500 ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <span className="grid place-items-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25D366] hover:bg-[#1ebd5b] shadow-xl ring-2 ring-white transition-colors">
        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.299-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      </span>
      {/* Subtle pulse ring */}
      <span aria-hidden className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 animate-ping pointer-events-none" style={{ animationDuration: "2.5s" }} />
    </a>
  );
}
