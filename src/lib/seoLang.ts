import type { Metadata } from "next";
import { getServerLang } from "./i18n-server";
import type { Lang } from "./i18n";

/**
 * Canonical + hreflang links for pages that exist in English, Sinhala and Tamil
 * (/, /shop, /offers, /category/*, /product/* — see LOCALIZED_PATH in middleware).
 * Each language version is canonical to itself and lists the other two.
 */
export function langPath(path: string, lang: Lang) {
  if (lang === "en") return path;
  return `/${lang}${path === "/" ? "" : path}`;
}

export async function langAlternates(path: string): Promise<Metadata["alternates"]> {
  const lang = await getServerLang();
  return {
    canonical: langPath(path, lang),
    languages: {
      "en-LK": path,
      "si-LK": langPath(path, "si"),
      "ta-LK": langPath(path, "ta"),
      "x-default": path,
    },
  };
}

/** The product name to show in the current language (falls back to English). */
export function productName(p: { name: string; nameSi?: string | null; nameTa?: string | null }, lang: Lang) {
  return (lang === "si" && p.nameSi) || (lang === "ta" && p.nameTa) || p.name;
}

/** Copy of a product list with names swapped to the current language. */
export function localizeProducts<T extends { name: string; nameSi?: string | null; nameTa?: string | null }>(list: T[], lang: Lang): T[] {
  return lang === "en" ? list : list.map(p => ({ ...p, name: productName(p, lang) }));
}
