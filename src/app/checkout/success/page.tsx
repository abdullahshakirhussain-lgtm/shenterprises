import Link from "next/link";
import { Spool } from "@/components/CraftDecorations";

export default function SuccessPage({ searchParams }: { searchParams: { order?: string } }) {
  return (
    <div className="container-x py-16">
      <div className="relative overflow-hidden rounded-2xl bg-white border border-saffron-200/60 shadow-md p-10 max-w-xl mx-auto text-center stitched">
        <Spool className="absolute -bottom-4 -right-4 w-28 h-28 text-saffron-300 opacity-50 pointer-events-none" />
        <div className="relative">
          <div className="text-5xl mb-3">✂️</div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-saffron-600 mb-2">Order placed</p>
          <h1 className="font-display text-3xl text-ink mb-3">We&apos;ve measured, cut, and packed it.</h1>
          <p className="text-ink-mute mb-6">
            Order <strong className="text-ink">{searchParams.order}</strong> is on the workbench. We&apos;ll be in touch shortly to confirm delivery.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/" className="rounded-xl bg-ink hover:bg-ink-soft text-cream text-sm font-bold px-5 py-2.5 transition-colors">
              Back to home
            </Link>
            <Link href="/track" className="rounded-xl border-2 border-saffron-300 text-saffron-700 hover:bg-saffron-50 text-sm font-bold px-5 py-2.5 transition-colors">
              Track my order
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
