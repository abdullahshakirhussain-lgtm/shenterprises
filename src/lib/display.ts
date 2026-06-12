import type { Lang } from "./i18n";

/**
 * Pick the localized name for a record that has name / nameSi / nameTa fields.
 * Falls back to English if the translation is missing.
 */
export function localizedName<T extends { name: string; nameSi?: string | null; nameTa?: string | null }>(
  rec: T,
  lang: Lang
): string {
  if (lang === "si" && rec.nameSi) return rec.nameSi;
  if (lang === "ta" && rec.nameTa) return rec.nameTa;
  return rec.name;
}
