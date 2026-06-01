import Link from "next/link";

export default function Footer({ phone, email, address }: { phone?: string; email?: string; address?: string }) {
  return (
    <footer className="mt-16 border-t border-brand-100 bg-white">
      <div className="container-x py-10 grid gap-8 md:grid-cols-4">
        <div>
          <div className="font-display text-xl text-brand-900 mb-2">SH Enterprises</div>
          <p className="text-sm text-brand-800/80">Quality craft & tailoring supplies — threads, zippers, scissors, elastics, ribbons, buttons and more. Island-wide delivery in Sri Lanka.</p>
        </div>
        <div>
          <div className="font-semibold mb-2 text-brand-900">Shop</div>
          <ul className="space-y-1 text-sm">
            <li><Link href="/category/threads">Threads</Link></li>
            <li><Link href="/category/zippers">Zippers</Link></li>
            <li><Link href="/category/buttons">Buttons</Link></li>
            <li><Link href="/offers">Offers</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2 text-brand-900">Help</div>
          <ul className="space-y-1 text-sm">
            <li><Link href="/cart">Cart</Link></li>
            <li><Link href="/checkout">Checkout</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2 text-brand-900">Contact</div>
          <ul className="space-y-1 text-sm">
            {phone && <li>📞 {phone}</li>}
            {email && <li>✉️ {email}</li>}
            {address && <li>📍 {address}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-brand-100 py-4 text-center text-xs text-brand-700">
        © {new Date().getFullYear()} SH Enterprises. All rights reserved.
      </div>
    </footer>
  );
}
