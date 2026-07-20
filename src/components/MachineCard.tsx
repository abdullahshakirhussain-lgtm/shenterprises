import Link from "next/link";
import { formatLKR } from "@/lib/utils";
import SmartImage from "@/components/SmartImage";

/**
 * Editorial machine card — shared by the /machines hub and the type hub pages.
 * Server component: pure links, no client JS.
 */

export const WA_ICON =
  "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.4-.7-2.9-1.1-4.7-4-4.8-4.2-.2-.2-1.2-1.5-1.2-2.9s.7-2 1-2.3c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.4l.9 2.1c.1.2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.4 2.5 1.5.3.2.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .7-.2 1.3z";
export const TEL_ICON =
  "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z";

export type MachineCardData = {
  id: number;
  slug: string;
  brand: string;
  modelNumber: string;
  name: string;
  category: string | null;
  price: number | null;
  imageUrl: string | null;
};

export default function MachineCard({ m, waHref }: { m: MachineCardData; waHref: string }) {
  return (
    <div className="bg-white border border-[#E8E0D2] rounded-[18px] overflow-hidden flex flex-col transition-transform transition-shadow duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(29,26,22,.09)]">
      <Link href={`/machines/${m.slug}`} className="relative block aspect-[4/3] bg-[#FDFBF7] border-b border-[#F0EADD] grid place-items-center overflow-hidden">
        {m.imageUrl ? (
          <SmartImage src={m.imageUrl} alt={`${m.brand} ${m.modelNumber} — ${m.name}`} sizes="(max-width: 640px) 100vw, 300px" fit="contain" />
        ) : (
          <span className="text-5xl opacity-20">⚙️</span>
        )}
      </Link>
      <div className="p-5 flex flex-col gap-1.5 flex-1">
        {m.category && <span className="text-[11.5px] font-extrabold tracking-[.12em] uppercase text-[#B9741F]">{m.category}</span>}
        <Link href={`/machines/${m.slug}`} className="font-display font-semibold text-[23px] text-[#1D1A16] tracking-[-.01em] hover:text-[#B9741F]">{m.brand} {m.modelNumber}</Link>
        <span className="text-[13.5px] font-semibold text-[#6E6459] leading-[1.5]">{m.name}</span>
        <span className="text-[15px] font-extrabold text-[#1D1A16] mt-1.5">{m.price != null ? formatLKR(m.price) : "Enquire for price"}</span>
        <div className="grid grid-cols-[1fr_52px] gap-2 mt-2.5">
          <Link href={`/machines/${m.slug}`} className="flex items-center justify-center min-h-[46px] bg-[#1D1A16] text-[#FAF7F2] font-extrabold text-sm rounded-[12px] transition-transform hover:-translate-y-0.5">Enquire</Link>
          <a href={waHref} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp enquiry for ${m.modelNumber}`} className="flex items-center justify-center min-h-[46px] bg-[#E9F7EF] border-[1.5px] border-[#BCE5CD] text-[#1F9D55] rounded-[12px] transition-transform hover:-translate-y-0.5">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d={WA_ICON} /></svg>
          </a>
        </div>
      </div>
    </div>
  );
}
