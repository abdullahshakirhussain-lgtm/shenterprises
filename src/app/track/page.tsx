import { Suspense } from "react";
import TrackForm from "./TrackForm";
import type { Metadata } from "next";

// Order-lookup tool: ?order= driven, per-order content — noindex (follow links).
export const metadata: Metadata = { title: "Track Your Order", robots: { index: false, follow: true } };

export default function TrackPage() {
  return (
    <div className="container-x py-12 max-w-xl mx-auto">
      <Suspense fallback={null}>
        <TrackForm />
      </Suspense>
    </div>
  );
}
