import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** The board's own address; `/` is the landing page. */
const BOARD = "/jelajah";

/**
 * Keeps the Supabase session cookie fresh, and decides who `/` belongs to.
 *
 * Access tokens are short lived. Server Components cannot write cookies, so
 * without this the refreshed token would be thrown away on every render and
 * people would get signed out mid-visit.
 *
 * The two redirects live here rather than in the page because the landing page
 * streams a skeleton first: `redirect()` inside it would arrive as a meta
 * refresh after a 200, which is a soft bounce for a visitor and nothing at all
 * for a crawler. Here it is a real 307 before anything renders.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // The board moved out of `/`, but the links people already shared did not.
  // A filtered or searched address is the board's, so hand it on with its
  // query intact instead of dropping the visitor on a pitch.
  if (request.nextUrl.pathname === "/" && request.nextUrl.search) {
    const target = request.nextUrl.clone();
    target.pathname = BOARD;
    return NextResponse.redirect(target, 307);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  // A guest carries no auth cookie, so there is no session to refresh — and
  // getUser() below is a network round trip to the auth server. Skipping it
  // takes that latency off every anonymous page view, which is most of them.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
  if (!hasAuthCookie) return response;

  const supabase = createServerClient(url, anonKey, {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Somebody who already joined does not need to be sold the site again — the
  // front door opens onto the board for them.
  if (user && request.nextUrl.pathname === "/") {
    const target = request.nextUrl.clone();
    target.pathname = BOARD;
    return NextResponse.redirect(target, 307);
  }

  return response;
}

export const config = {
  // Everything except static assets and the image optimiser.
  matcher: ["/((?!_next/static|_next/image|favicon.svg|apple-touch-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
