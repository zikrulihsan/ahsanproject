import { cache } from "react";
import { cookies } from "next/headers";
import { isLocale, LANGUAGE_COOKIE, type Locale } from "./locale";

/** The current request's language. English is the product default. */
export const currentLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  return isLocale(value) ? value : "en";
});
