"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const { t } = useLanguage();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, password }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error || "Login failed"); return; }
    router.push(sp.get("next") || "/account");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-6 w-full max-w-md mx-auto space-y-3">
      <h1 className="font-display text-2xl text-brand-900 text-center">{t("log_in")}</h1>
      <p className="text-sm text-brand-700 text-center">{t("login_subtitle")}</p>
      <div><label className="label">{t("phone_number")}</label><input className="input" placeholder="07X XXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus /></div>
      <div><label className="label">{t("password")}</label><input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {err && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{err}</div>}
      <button disabled={busy} className="btn-primary w-full">{busy ? t("logging_in") : t("log_in")}</button>
      <p className="text-sm text-center text-brand-700">
        {t("no_account")} <Link href="/account/register" className="text-brand-600 underline">{t("create_one")}</Link>
      </p>
    </form>
  );
}
