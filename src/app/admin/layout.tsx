import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth";

export const metadata = { title: "Admin — SH Enterprises", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  // login page bypasses via middleware
  return (
    <div className="min-h-screen flex flex-col">
      {admin && (
        <header className="bg-brand-900 text-white sticky top-0 z-40">
          <div className="container-x flex items-center gap-4 py-3">
            <Link href="/admin" className="font-display text-xl">SH Admin</Link>
            <nav className="flex flex-wrap gap-3 text-sm ml-2">
              <Link href="/admin" className="hover:text-brand-200">Dashboard</Link>
              <Link href="/admin/banners" className="hover:text-brand-200">Banners</Link>
              <Link href="/admin/products" className="hover:text-brand-200">Products</Link>
              <Link href="/admin/categories" className="hover:text-brand-200">Categories</Link>
              <Link href="/admin/import" className="hover:text-brand-200">Import CSV</Link>
              <Link href="/admin/orders" className="hover:text-brand-200">Orders</Link>
              <Link href="/admin/customers" className="hover:text-brand-200">Customers</Link>
              <Link href="/admin/users" className="hover:text-brand-200">Members</Link>
              <Link href="/admin/discounts" className="hover:text-brand-200">Discounts</Link>
              <Link href="/admin/coupons" className="hover:text-brand-200">Coupons</Link>
              <Link href="/admin/reviews" className="hover:text-brand-200">Reviews</Link>
              <Link href="/admin/analytics" className="hover:text-brand-200">Analytics</Link>
              <Link href="/admin/delivery" className="hover:text-brand-200">Delivery</Link>
              <Link href="/admin/settings" className="hover:text-brand-200">Settings</Link>
            </nav>
            <div className="ml-auto flex items-center gap-3 text-sm">
              <Link href="/" target="_blank" className="hover:text-brand-200">View site →</Link>
              <span>{admin.username}</span>
              <form action="/api/admin/logout" method="POST">
                <button className="px-3 py-1 rounded border border-white/30 hover:bg-white/10">Logout</button>
              </form>
            </div>
          </div>
        </header>
      )}
      <main className="flex-1 bg-brand-50/40">{children}</main>
    </div>
  );
}
