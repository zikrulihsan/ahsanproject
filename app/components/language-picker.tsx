"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "./language-provider";
import { LANGUAGE_PARAM, LOCALES, type Locale } from "../lib/locale";

const OPTION: Record<Locale, { label: string; nativeName: string }> = {
  id: { label: "Bahasa Indonesia", nativeName: "ID" },
  en: { label: "English", nativeName: "EN" },
};

/**
 * The full-page version of the language choice, for /account/language.
 *
 * Same mechanism as the header switcher used to be: an ordinary `<Link>` to
 * this same page carrying ?lang=, which proxy.ts turns into the language every
 * Server Component reads. Both options are prefetched, so picking one swaps a
 * page the browser already holds rather than waiting on the server.
 */
export function LanguagePicker() {
  const { locale, choose, tx } = useLanguage();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(target: Locale): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set(LANGUAGE_PARAM, target);
    return `${pathname}?${params}`;
  }

  return (
    <div className="language-picker" role="radiogroup" aria-label={tx("Pilih bahasa", "Choose language")}>
      {LOCALES.map((target) => (
        <Fragment key={target}>
          <Link
            href={hrefFor(target)}
            prefetch
            replace
            scroll={false}
            hrefLang={target}
            role="radio"
            aria-checked={locale === target}
            className={`language-option ${locale === target ? "is-active" : ""}`}
            onClick={() => choose(target)}
          >
            <span className="language-option-name">{OPTION[target].label}</span>
            <span className="language-option-code" aria-hidden="true">{OPTION[target].nativeName}</span>
            {locale === target ? (
              <span className="language-option-check" aria-hidden="true">✓</span>
            ) : null}
          </Link>
        </Fragment>
      ))}
    </div>
  );
}
