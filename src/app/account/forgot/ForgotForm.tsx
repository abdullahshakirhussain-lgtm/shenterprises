"use client";
import { useState } from "react";
import Link from "next/link";

// Two steps: (1) phone → SMS code, (2) code + new password.
export default function ForgotForm() {
  const [step, setStep] = useState<"phone" | "reset" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: object) {
    setBusy(true); setErr("");
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error || "Something went wrong. Please try again."); return false; }
      return true;
    } catch {
      setErr("Network error. Please try again.");
      return false;
    } finally { setBusy(false); }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^0\d{9}$/.test(phone)) { setErr("Enter your 10-digit phone number starting with 0."); return; }
    if (await post("/api/auth/reset/send-code", { phone })) setStep("reset");
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (await post("/api/auth/reset/confirm", { phone, code, password })) setStep("done");
  }

  if (step === "done") {
    return (
      <div className="card p-6 w-full max-w-md mx-auto space-y-3 text-center">
        <h1 className="font-display text-2xl text-brand-900">Password updated</h1>
        <p className="text-sm text-brand-700">You can now log in with your new password.</p>
        <Link href="/account/login" className="btn-primary w-full inline-block">Log in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={step === "phone" ? sendCode : reset} className="card p-6 w-full max-w-md mx-auto space-y-3">
      <h1 className="font-display text-2xl text-brand-900 text-center">Reset your password</h1>
      {step === "phone" ? (
        <>
          <p className="text-sm text-brand-700 text-center">Enter the phone number on your account and we&apos;ll text you a code.</p>
          <div>
            <label className="label" htmlFor="reset-phone">Phone number</label>
            <input id="reset-phone" className="input" type="tel" inputMode="numeric" maxLength={10} placeholder="07X XXX XXXX" autoFocus
              value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-brand-700 text-center">If {phone} has an account, a 6-digit code is on its way. It expires in 10 minutes.</p>
          <div>
            <label className="label" htmlFor="reset-code">Code from SMS</label>
            <input id="reset-code" className="input tracking-[.3em] text-center" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
          </div>
          <div>
            <label className="label" htmlFor="reset-password">New password</label>
            <input id="reset-password" className="input" type="password" autoComplete="new-password" minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="text-xs text-brand-600 mt-1">At least 6 characters.</p>
          </div>
        </>
      )}
      {err && <div className="text-sm text-red-700 bg-red-50 p-2 rounded" role="alert">{err}</div>}
      <button disabled={busy} className="btn-primary w-full">
        {busy ? "Please wait…" : step === "phone" ? "Send code" : "Set new password"}
      </button>
      <p className="text-sm text-center text-brand-700">
        {step === "reset"
          ? <button type="button" className="text-brand-600 underline" onClick={() => { setStep("phone"); setCode(""); setErr(""); }}>Use a different number / resend</button>
          : <>Remembered it? <Link href="/account/login" className="text-brand-600 underline">Log in</Link></>}
      </p>
    </form>
  );
}
