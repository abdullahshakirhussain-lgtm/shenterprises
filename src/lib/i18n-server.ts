import { cookies, headers } from "next/headers";
import { translations, type Lang, type TranslationKey } from "./i18n";

export async function getServerLang(): Promise<Lang> {
  // /si/... and /ta/... URLs (set by middleware) win over the cookie, so each
  // language URL always renders in its own language — that is what Google indexes.
  const h = (await headers()).get("x-sh-lang");
  if (h === "si" || h === "ta") return h;
  const c = (await cookies()).get("sh_lang")?.value;
  if (c === "si" || c === "ta" || c === "en") return c;
  return "en";
}

/** Server component translation helper. Use like:
 *    const t = getT();
 *    return <h1>{t("checkout")}</h1>;
 */
export async function getT() {
  const lang = await getServerLang();
  return (k: TranslationKey): string => translations[lang][k] ?? translations.en[k] ?? k;
}
