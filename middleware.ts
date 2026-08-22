import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Keeps the Supabase session cookie fresh.
 *
 * Access tokens are short lived. Server Components cannot write cookies, so
 * without this the refreshed token would be thrown away on every render and
 * people would get signed out mid-visit.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

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

  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Everything except static assets and the image optimiser.
  matcher: ["/((?!_next/static|_next/image|favicon.svg|apple-touch-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
