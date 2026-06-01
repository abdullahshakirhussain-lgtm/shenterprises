"use client";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { useEffect, useState } from "react";

export default function Header({ categories }: { categories: { name: string; slug: string }[] }) {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [me, setMe] = useState<{ fullName: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setMe(d.user));
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-brand-100">
      <div className="container-x flex items-center gap-4 py-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-md bg-brand-600 text-white grid place-items-center font-display font-bold">SH</div>
          <span className="font-display text-xl text-brand-900 hidden sm:inline">SH Enterprises</span>
        </Link>

        <form action="/search" className="hidden md:flex flex-1 max-w-xl">
          <input name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search threads, zippers, buttons…" className="input rounded-r-none" />
          <button className="btn-primary rounded-l-none">Search</button>
        </form>

        <nav className="ml-auto flex items-center gap-1">
          <Link href="/offers" className="btn-ghost text-sm">Offers</Link>
          {me ? (
            <Link href="/account" className="btn-ghost text-sm">Hi, {me.fullName.split(" ")[0]}</Link>
          ) : (
            <Link href="/account/login" className="btn-ghost text-sm">Login</Link>
          )}
          <Link href="/cart" className="btn-secondary text-sm relative">
            Cart
            {count > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-brand-600 text-white text-xs">
                {count}
              </span>
            )}
          </Link>
          <button onClick={() => setOpen((v) => !v)} className="md:hidden btn-ghost" aria-label="Menu">☰</button>
        </nav>
      </div>

      <div className="border-t border-brand-100 bg-brand-50/50">
        <div className="container-x">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="shrink-0 text-sm px-3 py-1.5 rounded-full bg-white border border-brand-200 text-brand-800 hover:bg-brand-100"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-brand-100 bg-white p-3">
          <form action="/search" className="flex">
            <input name="q" placeholder="Search…" className="input rounded-r-none" />
            <button className="btn-primary rounded-l-none">Go</button>
          </form>
        </div>
      )}
    </header>
  );
}
