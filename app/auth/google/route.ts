import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resilientSupabaseFetch } from "../../lib/resilient-fetch";
import { safeNextPath } from "../../lib/urls";

/**
 * Starts the Google sign-in, and hands the browser the cookie that finishes it.
 *
 * A route handler rather than a server action, and the difference is the whole
 * point. `signInWithOAuth` generates the PKCE code verifier and writes it as a
 * cookie; `/auth/callback` reads it back to trade the authorization code for a
 * session. Lose that cookie anywhere in between and the callback fails saying
 * the verifier is missing — which reads like a misconfigured redirect URL and
 * is not one.
 *
 * As a server action the write had to survive being attached to an action
 * response that then redirects off-site, through a client-side navigation and a
 * hosting layer, before the browser ever stored it. Here the verifier is set on
 * the very redirect that sends somebody to Google: one response, carrying both
 * the destination and the cookie that will make the return trip work.
 *
 * Nothing changes state, so a plain GET is right — and a link works with no
 * JavaScript, which the submit button it replaces did not.
 */
export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return refuse(request, next);

  // Collected rather than written through `cookies()`: these have to land on
  // the redirect below, and nowhere else.
  const pending: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(url, anonKey, {
    global: { fetch: resilientSupabaseFetch },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        pending.push(...cookiesToSet);
      },
    },
  });

  // The origin being served, not a configured one: the verifier is stored
  // against this host, so the callback has to come back to this host. See
  // `siteOrigin()` in app/lib/origin.ts for the same rule stated at length.
  const callback = new URL("/auth/callback", request.nextUrl.origin);
  callback.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
  });

  if (error || !data.url) {
    console.error("[ahsan] Google OAuth gagal dimulai.", error);
    return refuse(request, next);
  }

  if (pending.length === 0) {
    // Without a verifier the round trip cannot succeed, and Google would send
    // them back to a failure. Better to stop here than to spend somebody's time
    // proving it.
    console.error("[ahsan] Verifier PKCE tidak dihasilkan; Google OAuth dibatalkan.");
    return refuse(request, next);
  }

  const response = NextResponse.redirect(data.url);
  for (const { name, value, options } of pending) {
    response.cookies.set(name, value, options);
  }
  return response;
}

function refuse(request: NextRequest, next: string): NextResponse {
  const destination = new URL("/signin", request.url);
  destination.searchParams.set("error", "google-gagal");
  if (next !== "/") destination.searchParams.set("next", next);
  return NextResponse.redirect(destination);
}
