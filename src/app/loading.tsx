// Shown automatically by Next.js while any page's server-side data loads.
// Keeps the user from seeing a blank screen during slow DB calls or back-button navigation.

export default function Loading() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="flex flex-col items-center gap-3">
        <div className="text-4xl animate-spin">🧵</div>
        <p className="text-sm text-brand-700">Loading…</p>
      </div>
    </div>
  );
}
