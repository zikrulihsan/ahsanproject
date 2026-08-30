"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "./language-provider";
import { LANGUAGE_PARAM, LOCALES, type Locale } from "../lib/locale";

const LABEL: Record<Locale, string> = { id: "ID", en: "EN" };

/**
 * Two links, one per language, rather than two buttons and a refresh.
 *
 * `router.refresh()` empties the whole Router Cache before a single word
 * changes, so one click cost a re-render of this page *and* a fresh prefetch of
 * every other link on it — around ten server renders, for a page whose data
 * does not depend on the language at all. These are ordinary navigations to the
 * same page carrying ?lang=, which proxy.ts turns into the language every
 * Server Component reads. Nothing else in the cache is disturbed, and because
 * both are prefetched while they sit in the header, the click usually swaps a
 * page the browser is already holding.
 */
export function LanguageSwitcher() {
  const { locale, choose, tx } = useLanguage();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(target: Locale): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set(LANGUAGE_PARAM, target);
    return `${pathname}?${params}`;
  }

  return (
    <div className="language-switcher" role="group" aria-label={tx("Pilih bahasa", "Choose language")}>
      {LOCALES.map((target, index) => (
        <Fragment key={target}>
          {index > 0 ? <span aria-hidden="true">/</span> : null}
          <Link
            href={hrefFor(target)}
            prefetch
            replace
            scroll={false}
            hrefLang={target}
            className={locale === target ? "is-active" : ""}
            aria-current={locale === target ? "true" : undefined}
            onClick={() => choose(target)}
          >
            {LABEL[target]}
          </Link>
        </Fragment>
      ))}
    </div>
  );
}
