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
      <h2 className="font-display text-2xl text-brand-900 mb-2">Something went wrong</h2>
      <p className="text-brand-700 mb-4">
        The page couldn&apos;t load. This is usually temporary — try again.
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
