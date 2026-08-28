import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resilientSupabaseFetch } from "./app/lib/resilient-fetch";
import { strayCodeTarget } from "./app/lib/urls";

/**
 * Keeps the Supabase session cookie fresh.
 *
 * Access tokens are short lived. Server Components cannot write cookies, so
 * without this the refreshed token would be thrown away on every render and
 * people would get signed out mid-visit.
 */
export async function proxy(request: NextRequest) {
  // The discovery board moved off the landing page. Redirect its old query
  // URLs before a Server Component starts streaming, so bookmarks and shared
  // links land on the real collaboration page with an actual HTTP redirect.
  if (request.nextUrl.pathname === "/") {
    const boardKeys = ["stage", "lane", "tag", "role", "q", "cari", "needs"];
    if (boardKeys.some((key) => request.nextUrl.searchParams.has(key))) {
      const destination = request.nextUrl.clone();
      destination.pathname = "/kolaborasi";
      return NextResponse.redirect(destination);
    }
  }

  // An OAuth code that landed anywhere but /auth/callback. Supabase falls back
  // to the Site URL when a redirect target is not on its allow list, so a
  // missing entry there drops the code on the home page, where nothing spends
  // it and the visitor simply stays signed out with no idea why. Send it where
  // it can be spent — or, if they are already signed in, take the spent code
  // out of the URL rather than fail on it. See strayCodeTarget.
  const stray = strayCodeTarget(
    request.nextUrl.pathname,
    request.nextUrl.searchParams,
    hasSessionCookie(request),
  );
  if (stray) {
    const destination = request.nextUrl.clone();
    destination.pathname = stray.pathname;
    destination.search = stray.search;
    return NextResponse.redirect(destination);
  }

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  // A guest carries no auth cookie, so there is no session to refresh — and
  // getUser() below is a network round trip to the auth server. Skipping it
  // takes that latency off every anonymous page view, which is most of them.
  if (!hasSessionCookie(request)) return response;

  const supabase = createServerClient(url, anonKey, {
    global: { fetch: resilientSupabaseFetch },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch (error) {
    // A stale session must not make every public route unreachable when the
    // auth service is briefly unavailable. The page can continue as a guest;
    // writes still perform their own authenticated checks.
    console.error("[ahsan] Refresh sesi dilewati karena Supabase Auth tidak merespons.", error);
  }

  return response;
}

/**
 * Whether this request carries a session at all.
 *
 * The `-code-verifier` cookie is deliberately excluded. It shares the
 * `sb-<ref>-auth-token` prefix but means the opposite thing: it is written when
 * a sign-in *starts*, so counting it would read a visitor mid-login as already
 * signed in — and the stray-code guard would then strip the very code it was
 * about to spend.
 */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith("sb-") &&
        cookie.name.includes("-auth-token") &&
        !cookie.name.includes("code-verifier"),
    );
}

export const config = {
  // Everything except static assets and the image optimiser.
  matcher: ["/((?!_next/static|_next/image|favicon.svg|apple-touch-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
