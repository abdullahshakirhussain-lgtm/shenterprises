"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Step = "phone" | "otp" | "details";

export default function RegisterForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [firstOrderDiscount, setFirstOrderDiscount] = useState(0);

  useEffect(() => {
    fetch("/api/settings/public").then((r) => r.json()).then((d) => {
      const v = parseFloat(d.account_discount_percent || "0");
      if (!isNaN(v)) setDiscount(v);
      try {
        const tiers = JSON.parse(d.new_customer_tiers || "[]");
        const first = tiers.find((t: any) => t.order === 1);
        if (first) setFirstOrderDiscount(first.percent);
      } catch {}
    });
  }, []);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error || "Failed to send OTP"); return; }
    setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code: otp }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error || "Verification failed"); return; }
    setStep("details");
  }

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error || "Registration failed"); return; }
    router.push(sp.get("next") || "/account");
    router.refresh();
  }

  const stepLabel = step === "phone" ? "Step 1 of 3" : step === "otp" ? "Step 2 of 3" : "Step 3 of 3";

  return (
    <div className="card p-6 w-full max-w-md mx-auto space-y-4">
      <div>
        <h1 className="font-display text-2xl text-brand-900 text-center">Create an account</h1>
        <p className="text-xs text-center text-brand-500 mt-1">{stepLabel}</p>
      </div>

      {(discount > 0 || firstOrderDiscount > 0) && (
        <div className="bg-brand-50 border border-brand-200 rounded p-3 text-sm space-y-1">
          {firstOrderDiscount > 0 && (
            <p className="text-center font-medium text-brand-800">Your first order gets <strong>{firstOrderDiscount}% off!</strong></p>
          )}
          {discount > 0 && (
            <p className="text-center text-brand-700">Members get <strong>{discount}% off</strong> every order</p>
          )}
        </div>
      )}

      {step === "phone" && (
        <form onSubmit={sendOtp} className="space-y-3">
          <div>
            <label className="label">Phone number *</label>
            <input required className="input" placeholder="07X XXX XXXX" value={phone}
              onChange={(e) => setPhone(e.target.value)} />
            <p className="text-xs text-brand-500 mt-1">We'll send a verification code to this number.</p>
          </div>
          {err && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{err}</div>}
          <button disabled={busy} className="btn-primary w-full">{busy ? "Sending…" : "Send OTP"}</button>
          <p className="text-sm text-center text-brand-700">
            Already have an account? <Link href="/account/login" className="text-brand-600 underline">Log in</Link>
          </p>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={verifyOtp} className="space-y-3">
          <div>
            <label className="label">Verification code *</label>
            <input required className="input text-center tracking-widest text-lg" maxLength={6}
              placeholder="------" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
            <p className="text-xs text-brand-500 mt-1">Enter the 6-digit code sent to <strong>{phone}</strong></p>
          </div>
          {err && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{err}</div>}
          <button disabled={busy} className="btn-primary w-full">{busy ? "Verifying…" : "Verify"}</button>
          <button type="button" className="w-full text-sm text-brand-600 underline" onClick={() => { setStep("phone"); setErr(""); setOtp(""); }}>
            Change phone number
          </button>
        </form>
      )}

      {step === "details" && (
        <form onSubmit={register} className="space-y-3">
          <div>
            <label className="label">Full name *</label>
            <input required className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">Password * <span className="text-brand-500 text-xs">(min 6 chars)</span></label>
            <input required type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{err}</div>}
          <button disabled={busy} className="btn-primary w-full">{busy ? "Creating…" : "Create account"}</button>
        </form>
      )}
    </div>
  );
}
