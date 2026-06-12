"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, type Lang, type TranslationKey } from "@/lib/i18n";

type LangCtx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TranslationKey) => string };

const Ctx = createContext<LangCtx>({ lang: "en", setLang: () => {}, t: (k) => k });

const COOKIE = "sh_lang";

function readCookie(): Lang {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|; )sh_lang=([^;]+)/);
  const v = m ? decodeURIComponent(m[1]) : "";
  return ["en", "si", "ta"].includes(v) ? (v as Lang) : "en";
}

function writeCookie(lang: Lang) {
  if (typeof document === "undefined") return;
  // 1-year cookie, available to server
  document.cookie = `${COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function LanguageProvider({
  children,
  initialLang = "en",
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  // Hydrate from cookie (in case SSR couldn't read it for some reason, or localStorage from old version)
  useEffect(() => {
    const fromCookie = readCookie();
    if (fromCookie !== lang) setLangState(fromCookie);
    // Migrate any stale localStorage value
    try {
      const old = localStorage.getItem("sh_lang");
      if (old && ["en", "si", "ta"].includes(old) && readCookie() === "en") {
        writeCookie(old as Lang);
        setLangState(old as Lang);
        localStorage.removeItem("sh_lang");
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    writeCookie(l);
    document.documentElement.lang = l;
  }

  function t(k: TranslationKey): string {
    return translations[lang][k] ?? translations.en[k] ?? k;
  }

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLanguage() { return useContext(Ctx); }
