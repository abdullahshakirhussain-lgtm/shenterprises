"use client";
import { useLanguage } from "./LanguageProvider";
import { useState, useRef, useEffect } from "react";
import type { Lang } from "@/lib/i18n";

const LANGS: { code: Lang; label: string; native: string }[] = [
  { code: "en", label: "EN", native: "English" },
  { code: "si", label: "සිං", native: "සිංහල" },
  { code: "ta", label: "தமி", native: "தமிழ்" },
];

export default function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = LANGS.find(l => l.code === lang) || LANGS[0];

  if (compact) {
    // Dropdown style — blends into the header nav
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1 text-ink/80 hover:text-brand-700 transition-colors px-1.5 py-1"
          aria-haspopup="true" aria-expanded={open}
          title="Change language"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span className="text-sm font-semibold">{current.label}</span>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" className={`transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M2 4l4 4 4-4z" />
          </svg>
        </button>
        {open && (
          <div className="absolute right-0 mt-1 w-36 bg-white border border-brand-200 rounded-lg shadow-lg overflow-hidden z-50">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setOpen(false); }}
                className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                  lang === l.code ? "bg-brand-50 text-brand-700 font-semibold" : "text-ink/80 hover:bg-brand-50"
                }`}
              >
                {l.native}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Footer style — three clickable buttons inline
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted">Language:</span>
      {LANGS.map((l, i) => (
        <span key={l.code} className="flex items-center">
          <button
            onClick={() => setLang(l.code)}
            className={`transition-colors ${
              lang === l.code ? "text-brand-700 font-bold" : "text-ink/70 hover:text-brand-600"
            }`}
          >
            {l.native}
          </button>
          {i < LANGS.length - 1 && <span className="text-brand-300 ml-2">·</span>}
        </span>
      ))}
    </div>
  );
}
