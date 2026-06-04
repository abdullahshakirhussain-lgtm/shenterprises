"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, type Lang, type TranslationKey } from "@/lib/i18n";

type LangCtx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TranslationKey) => string };

const Ctx = createContext<LangCtx>({ lang: "en", setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = (localStorage.getItem("sh_lang") || "en") as Lang;
    if (["en", "si", "ta"].includes(stored)) setLangState(stored);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("sh_lang", l);
    document.documentElement.lang = l;
  }

  function t(k: TranslationKey): string {
    return translations[lang][k] ?? translations.en[k] ?? k;
  }

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLanguage() { return useContext(Ctx); }
