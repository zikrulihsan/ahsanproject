"use client";

import { Fragment, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "./language-provider";
import { LANGUAGE_PARAM, LOCALES, type Locale } from "../lib/locale";

const OPTION: Record<Locale, { label: string; nativeName: string }> = {
  id: { label: "Bahasa Indonesia", nativeName: "ID" },
  en: { label: "English", nativeName: "EN" },
};

/** A plain left-click with no modifier — the case we should drive ourselves. */
function isPlainClick(event: React.MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * The full-page version of the language choice, for /account/language.
 *
 * Same mechanism as the header switcher used to be: an ordinary `<Link>` to
 * this same page carrying ?lang=, which proxy.ts turns into the language every
 * Server Component reads. Both options stay `<Link prefetch>` so the browser
 * fetches them ahead of the click — but the click itself is driven through
 * `useTransition` rather than left to Link's own navigation. `useLinkStatus`
 * (Link's usual way of reporting this) never reported pending for this
 * particular case: a query-string-only change to the very page it's on. This
 * gives the same "is it still working" signal without depending on that.
 */
export function LanguagePicker() {
  const { locale, choose, tx } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function hrefFor(target: Locale): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set(LANGUAGE_PARAM, target);
    return `${pathname}?${params}`;
  }

  function pick(event: React.MouseEvent, target: Locale) {
    if (!isPlainClick(event)) return; // let the browser open it in a new tab, etc.
    event.preventDefault();
    choose(target);
    startTransition(() => router.replace(hrefFor(target), { scroll: false }));
  }

  return (
    <div className="language-picker" role="radiogroup" aria-label={tx("Pilih bahasa", "Choose language")}>
      {LOCALES.map((target) => (
        <Fragment key={target}>
          <Link
            href={hrefFor(target)}
            prefetch
            hrefLang={target}
            role="radio"
            aria-checked={locale === target}
            className={`language-option ${locale === target ? "is-active" : ""}`}
            onClick={(event) => pick(event, target)}
          >
            <span className="language-option-name">{OPTION[target].label}</span>
            <span className="language-option-code" aria-hidden="true">{OPTION[target].nativeName}</span>
            {isPending && locale === target ? (
              <>
                <span className="language-option-spinner" aria-hidden="true" />
                <span role="status" className="sr-only">{tx("Mengganti bahasa…", "Switching language…")}</span>
              </>
            ) : locale === target ? (
              <span className="language-option-check" aria-hidden="true">✓</span>
            ) : null}
          </Link>
        </Fragment>
      ))}
    </div>
  );
}
