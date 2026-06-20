"use client";
// Catches any rendering error in the route tree and shows a recoverable UI.
// Without this, a Supabase blip during back-button navigation would leave a blank page.

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <div className="container-x py-16 text-center">
      <div className="text-5xl mb-3">🧵</div>
      <h2 className="font-display text-3xl text-ink mb-2">A thread came loose.</h2>
      <p className="text-ink-mute mb-5 max-w-md mx-auto">
        Something tangled while loading this page. Usually it&apos;s temporary — pull the thread again.
      </p>
      <div className="flex gap-2 justify-center">
        <button onClick={reset} className="btn-primary">Try again</button>
        <a href="/" className="btn-secondary">Go home</a>
      </div>
      {error.digest && (
        <p className="text-xs text-brand-500 mt-4">Error ref: {error.digest}</p>
      )}
    </div>
  );
}
