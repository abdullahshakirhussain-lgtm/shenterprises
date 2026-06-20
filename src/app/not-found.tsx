import Link from "next/link";
import { ThreadLoop } from "@/components/CraftDecorations";

export default function NotFound() {
  return (
    <div className="container-x py-20 text-center relative overflow-hidden">
      <ThreadLoop className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-32 text-thread-maple-500 opacity-25 pointer-events-none" />
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-thread-maple-600 mb-3">404</p>
        <h1 className="font-display text-4xl sm:text-5xl text-ink mb-3">We&apos;ve dropped a stitch.</h1>
        <p className="text-ink-mute mb-7 max-w-md mx-auto">
          The page you&apos;re after must&apos;ve unravelled. Let&apos;s get you back to something whole.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="rounded-xl bg-ink hover:bg-ink-soft text-cream text-sm font-bold px-5 py-2.5 transition-colors">
            Back to home
          </Link>
          <Link href="/shop" className="rounded-xl border-2 border-saffron-300 text-saffron-700 hover:bg-saffron-50 text-sm font-bold px-5 py-2.5 transition-colors">
            Browse the shop
          </Link>
        </div>
      </div>
    </div>
  );
}
