import Link from "next/link";

/** Shared layout for the customer policy pages (delivery, returns, privacy, terms). */
export default function PolicyPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="container-x py-10 sm:py-14">
      <article className="max-w-2xl mx-auto">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-saffron-600">{eyebrow}</p>
        <h1 className="font-display text-3xl sm:text-4xl text-ink mt-1">{title}</h1>
        <p className="text-xs text-ink-mute mt-2">Last updated {updated}</p>
        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink-soft [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-ink [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-saffron-700 [&_a]:underline">
          {children}
        </div>
        <p className="mt-10 text-sm text-ink-mute">
          Questions? <Link href="/track">Track an order</Link> or contact us using the details at the bottom of this page.
        </p>
      </article>
    </div>
  );
}
