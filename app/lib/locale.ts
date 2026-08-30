export const LOCALES = ["id", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const LANGUAGE_COOKIE = "ahsan-language";

/** How the switcher asks a URL for the other language. See proxy.ts. */
export const LANGUAGE_PARAM = "lang";

export function isLocale(value: string | undefined): value is Locale {
  return value === "id" || value === "en";
}

/** Pick one of the two authored copies without hiding either in a remote catalogue. */
export function tx(locale: Locale, id: string, en: string): string {
  return locale === "id" ? id : en;
}
