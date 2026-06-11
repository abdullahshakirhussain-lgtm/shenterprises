"use client";
import { useState } from "react";

export default function SettingsForm({ initial }: { initial: Record<string, string> }) {
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function up(k: string, v: string) { setS({ ...s, [k]: v }); }

  async function save() {
    setSaving(true); setMsg("");
    const res = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    setSaving(false);
    setMsg(res.ok ? "Saved ✓" : "Save failed");
    setTimeout(() => setMsg(""), 2000);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <section className="card p-5">
        <h2 className="font-semibold mb-3">Contact information (footer)</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">Phone</label><input className="input" value={s.site_phone || ""} onChange={(e) => up("site_phone", e.target.value)} /></div>
          <div><label className="label">Email</label><input className="input" value={s.site_email || ""} onChange={(e) => up("site_email", e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="label">Address</label><input className="input" value={s.site_address || ""} onChange={(e) => up("site_address", e.target.value)} /></div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Bank deposit details (shown to customers)</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">Bank name</label><input className="input" value={s.bank_name || ""} onChange={(e) => up("bank_name", e.target.value)} /></div>
          <div><label className="label">Account name</label><input className="input" value={s.bank_account_name || ""} onChange={(e) => up("bank_account_name", e.target.value)} /></div>
          <div><label className="label">Account number</label><input className="input" value={s.bank_account_number || ""} onChange={(e) => up("bank_account_number", e.target.value)} /></div>
          <div><label className="label">Branch</label><input className="input" value={s.bank_branch || ""} onChange={(e) => up("bank_branch", e.target.value)} /></div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Search synonyms</h2>
        <div>
          <label className="label">Misspellings & synonyms (JSON)</label>
          <textarea
            rows={5}
            className="input font-mono text-sm"
            value={s.search_synonyms || ""}
            onChange={(e) => up("search_synonyms", e.target.value)}
            placeholder={`{"thred":"thread","zip":"zipper","sissor":"scissors","botton":"button","nedle":"needle","ribbn":"ribbon"}`}
          />
          <p className="text-xs text-brand-600 mt-1">
            Maps misspellings or alternate words to your product names. When a customer searches with a left-side word, the right-side word is searched too. Format: <code>&#123;"misspelling":"correct"&#125;</code>. Leave empty to disable.
          </p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Top promo strip (home page)</h2>
        <div>
          <label className="label">Promo message — leave empty to hide</label>
          <input className="input" value={s.promo_strip_text || ""} onChange={(e) => up("promo_strip_text", e.target.value)} placeholder='e.g. 40% off all threads — limited time!' />
          <p className="text-xs text-brand-600 mt-1">Shown as a thin ribbon above the header. Clicking it links to /offers.</p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Member discount</h2>
        <div>
          <label className="label">Default discount for logged-in customers (%) — 0 to disable</label>
          <input type="number" min="0" max="100" step="0.1" className="input max-w-xs" value={s.account_discount_percent || "0"} onChange={(e) => up("account_discount_percent", e.target.value)} />
          <p className="text-xs text-brand-600 mt-1">Applied to every order placed by a logged-in account. Override per-user in Admin → Members.</p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Delivery</h2>
        <div>
          <label className="label">Free delivery threshold (LKR) — set 0 to disable</label>
          <input type="number" min="0" className="input max-w-xs" value={s.free_delivery_threshold || "0"} onChange={(e) => up("free_delivery_threshold", e.target.value)} />
        </div>
        <div className="mt-3">
          <label className="label">Koombiyo API key</label>
          <input className="input" value={s.koombiyo_api_key || ""} onChange={(e) => up("koombiyo_api_key", e.target.value)} placeholder="Leave empty to use per-district rates" />
          <p className="text-xs text-brand-600 mt-1">When set, live rates are fetched from Koombiyo per city. Falls back to per-district rate on failure.</p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">DeepSeek (CSV import assistant)</h2>
        <div>
          <label className="label">DeepSeek API key</label>
          <input className="input" value={s.deepseek_api_key || ""} onChange={(e) => up("deepseek_api_key", e.target.value)} placeholder="sk-..." />
        </div>
        <div className="mt-3">
          <label className="label">Custom extraction prompt</label>
          <textarea rows={4} className="input" value={s.deepseek_prompt || ""} onChange={(e) => up("deepseek_prompt", e.target.value)} />
          <p className="text-xs text-brand-600 mt-1">Used by Import CSV when "Use AI to clean rows" is enabled. Output must be JSON with: name, description, price, sku, stock, category.</p>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save settings"}</button>
        {msg && <span className="text-sm text-green-700">{msg}</span>}
      </div>
    </div>
  );
}
