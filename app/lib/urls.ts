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
 * Where the board lives. `/` is the landing page — the pitch for somebody who
 * has never been here — so the board itself has its own address, and every
 * link into it goes through here rather than hard-coding a slash.
 */
export const boardPath = "/jelajah";

/** A board URL with its filters attached. Empty values are left out. */
export function boardLink(query: Record<string, string | undefined> = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    // "terbaru" is the board's own default, so naming it only makes the URL
    // longer and the same page look like two.
    if (value && !(key === "sort" && value === "terbaru")) params.set(key, value);
  }
  const search = params.toString();
  return search ? `${boardPath}?${search}` : boardPath;
}
