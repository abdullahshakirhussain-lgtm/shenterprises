import Link from "next/link";

export default function SuccessPage({ searchParams }: { searchParams: { order?: string } }) {
  return (
    <div className="container-x py-16">
      <div className="card p-8 max-w-xl mx-auto text-center">
        <div className="text-5xl mb-2">✅</div>
        <h1 className="font-display text-2xl text-brand-900 mb-2">Order placed!</h1>
        <p className="text-brand-700 mb-4">
          Your order <strong>{searchParams.order}</strong> has been received. We'll contact you shortly to confirm delivery.
        </p>
        <Link href="/" className="btn-primary">Back to home</Link>
      </div>
    </div>
  );
}
