import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x py-20 text-center">
      <h1 className="font-display text-4xl text-brand-900 mb-2">Page not found</h1>
      <p className="text-brand-700 mb-6">We couldn't find what you were looking for.</p>
      <Link href="/" className="btn-primary">Back to home</Link>
    </div>
  );
}
