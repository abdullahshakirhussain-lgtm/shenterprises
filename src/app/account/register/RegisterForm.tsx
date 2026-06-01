"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function RegisterForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [discount, setDiscount] = useState<number>(0);

  useEffect(() => {
    fetch("/api/settings/public").then((r) => r.json()).then((d) => {
      const v = parseFloat(d.account_discount_percent || "0");
      if (!isNaN(v)) setDiscount(v);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error || "Registration failed"); return; }
    router.push(sp.get("next") || "/account");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-6 w-full max-w-md mx-auto space-y-3">
      <h1 className="font-display text-2xl text-brand-900 text-center">Create an account</h1>
      {discount > 0 && (
        <div className="bg-brand-50 border border-brand-200 rounded p-3 text-sm text-center">
          🎉 Members get <strong>{discount}% off</strong> every order!
        </div>
      )}
      <div><label className="label">Full name *</label><input required className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
      <div><label className="label">Phone number *</label><input required className="input" placeholder="07X XXX XXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      <div><label className="label">Email (optional)</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      <div><label className="label">Password * <span className="text-brand-500 text-xs">(min 6 chars)</span></label><input required type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
      {err && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{err}</div>}
      <button disabled={busy} className="btn-primary w-full">{busy ? "Creating…" : "Create account"}</button>
      <p className="text-sm text-center text-brand-700">
        Already have an account? <Link href="/account/login" className="text-brand-600 underline">Log in</Link>
      </p>
    </form>
  );
}
