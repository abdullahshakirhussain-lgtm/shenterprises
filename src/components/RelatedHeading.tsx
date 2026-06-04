"use client";
import { useLanguage } from "./LanguageProvider";

export default function RelatedHeading() {
  const { t } = useLanguage();
  return <h2 className="font-display text-2xl text-brand-900">{t("related_products")}</h2>;
}
