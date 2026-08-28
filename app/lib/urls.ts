/**
 * Where links may point. No Next.js imports here on purpose: these are plain
 * functions, and `tests/urls.test.mjs` exercises them directly.
 */

/**
 * Keeps a `?next=` destination inside this site. Anything absolute, protocol
 * relative, or otherwise off-site collapses to the board — an open redirect on
 * a sign-in page is how people get walked to a convincing fake one.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";

  try {
    const url = new URL(value, "https://ahsan.local");
    if (url.origin !== "https://ahsan.local") return "/";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}

export function signInPath(next: string): string {
  const target = safeNextPath(next);
  return target === "/" ? "/signin" : `/signin?next=${encodeURIComponent(target)}`;
}

/**
 * Where somebody lands once they are signed in.
 *
 * A destination they actually asked for always wins: clicking "Saya tertarik"
 * on a project and signing in has to end up back on that project. Only a
 * plain sign-in, with nothing in mind, is sent to `/mulai` — which forwards
 * to the board on its own once there is nothing left to do there.
 */
export function startPath(next: string | null | undefined): string {
  const target = safeNextPath(next);
  return target === "/" ? "/mulai" : target;
}

/** The one route allowed to trade an authorization code for a session. */
export const CALLBACK_PATH = "/auth/callback";

/**
 * What to do with an OAuth `code` that turned up on the wrong page.
 *
 * A code only means something to `/auth/callback`. Anywhere else it sits in the
 * URL doing nothing — the person is not signed in, and the only evidence is a
 * page that behaves as though they never tried. This turns that dead end into
 * one of two outcomes, and which one depends on whether they already have a
 * session:
 *
 *   - no session → send the code where it can be spent, keeping `next` so they
 *     still land where they were going;
 *   - session already → do **not** try to spend it. A code is single use, so a
 *     spent one fails, and failing would throw somebody who is already signed
 *     in back to the sign-in page. Strip it from the URL instead.
 *
 * That second branch is also how a used code stops being kept: left alone it
 * stays in browser history and rides along in the `Referer` header of every
 * link clicked from that page.
 *
 * `null` means leave the request alone.
 */
export function strayCodeTarget(
  pathname: string,
  search: URLSearchParams,
  signedIn: boolean,
): { pathname: string; search: string } | null {
  const code = search.get("code");
  // `/auth/callback` is where a code belongs; redirecting it to itself loops.
  if (!code || pathname === CALLBACK_PATH) return null;

  if (signedIn) {
    const cleaned = new URLSearchParams(search);
    cleaned.delete("code");
    return { pathname, search: cleaned.toString() };
  }

  const forwarded = new URLSearchParams();
  forwarded.set("code", code);
  const next = search.get("next");
  // Where they were headed, unless the answer is this page — following a code
  // back to the page it was stranded on would strand it there again.
  const destination = safeNextPath(next ?? pathname);
  if (destination !== "/") forwarded.set("next", destination);

  return { pathname: CALLBACK_PATH, search: forwarded.toString() };
}

/**
 * Returns a consistently sized favicon for a public project website.
 *
 * Only ordinary web URLs qualify. Besides avoiding nonsense image requests,
 * this means a forged form submission cannot turn the card image into an
 * unexpected protocol such as javascript: or data:.
 */
export function faviconUrl(value: string | null | undefined): string {
  if (!value) return "";

  try {
    const website = new URL(value);
    if (website.protocol !== "http:" && website.protocol !== "https:") return "";

    return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(website.origin)}&sz=128`;
  } catch {
    return "";
  }
}

/** Only ordinary public web URLs may be loaded as project artwork. */
export function projectLogoUrl(value: string | null | undefined): string {
  if (!value) return "";

  try {
    const logo = new URL(value);
    return logo.protocol === "http:" || logo.protocol === "https:" ? logo.toString() : "";
  } catch {
    return "";
  }
}
