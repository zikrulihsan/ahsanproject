"use client";

import { useLanguage } from "./language-provider";

export function LanguageSwitcher() {
  const { locale, setLocale, tx } = useLanguage();

  return (
    <div className="language-switcher" role="group" aria-label={tx("Pilih bahasa", "Choose language")}>
      <button
        type="button"
        className={locale === "id" ? "is-active" : ""}
        aria-pressed={locale === "id"}
        onClick={() => setLocale("id")}
      >
        ID
      </button>
      <span aria-hidden="true">/</span>
      <button
        type="button"
        className={locale === "en" ? "is-active" : ""}
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
      >
        EN
      </button>
    </div>
  );
}
