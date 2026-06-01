"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const sp = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Login failed"); return; }
    router.push(sp.get("next") || "/admin");
  }

  return (
    <div className="min-h-screen grid place-items-center bg-brand-50 px-4">
      <form onSubmit={submit} className="card p-6 w-full max-w-sm space-y-3">
        <h1 className="font-display text-2xl text-brand-900 text-center">Admin Login</h1>
        <div><label className="label">Username</label><input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus /></div>
        <div><label className="label">Password</label><input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{error}</div>}
        <button disabled={loading} className="btn-primary w-full">{loading ? "Logging in…" : "Login"}</button>
        <p className="text-xs text-brand-600 text-center">Default: admin / admin123 — change in admin settings.</p>
      </form>
    </div>
  );
}
