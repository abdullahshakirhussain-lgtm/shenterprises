import { cookies } from "next/headers";
import { translations, type Lang, type TranslationKey } from "./i18n";

export function getServerLang(): Lang {
  const c = cookies().get("sh_lang")?.value;
  if (c === "si" || c === "ta" || c === "en") return c;
  return "en";
}

/** Server component translation helper. Use like:
 *    const t = getT();
 *    return <h1>{t("checkout")}</h1>;
 */
export function getT() {
  const lang = getServerLang();
  return (k: TranslationKey): string => translations[lang][k] ?? translations.en[k] ?? k;
}
