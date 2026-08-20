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
