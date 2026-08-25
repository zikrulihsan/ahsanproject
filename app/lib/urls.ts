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
