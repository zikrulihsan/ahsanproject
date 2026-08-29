import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resilientSupabaseFetch } from "../../lib/resilient-fetch";
import { sameOriginRedirect } from "../../lib/redirect";
import { siteOrigin } from "../../lib/origin";
import { pinnedOrigin, safeNextPath } from "../../lib/urls";

/**
 * Marks the one bounce this route is allowed to make, so a hosting layer that
 * reports a host we disagree with costs a single extra redirect instead of an
 * endless loop.
 */
const PINNED = "alamat";

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

  // Where the whole round trip has to happen: the verifier written below and
  // the callback that reads it back must be the same host, and this is the
  // only moment either can still be chosen. Nothing is written yet, so moving
  // somebody now costs a redirect and nothing else. See `pinnedOrigin`.
  const browser = await siteOrigin();
  const pinned = pinnedOrigin(process.env);
  if (pinned && pinned !== browser && request.nextUrl.searchParams.get(PINNED) !== "utama") {
    const start = new URL("/auth/google", pinned);
    start.searchParams.set("next", next);
    start.searchParams.set(PINNED, "utama");
    return NextResponse.redirect(start);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return refuse(next);

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

  // The origin the browser is on, not the one this function was invoked with:
  // the verifier is stored against the host in the address bar, so the callback
  // has to come back to that host. `request.nextUrl.origin` is the invoking
  // address, which behind Netlify can be the deploy's own permalink even when
  // nobody ever typed it. See `siteOrigin()` in app/lib/origin.ts.
  const callback = new URL("/auth/callback", pinned ?? browser);
  callback.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
  });

  if (error || !data.url) {
    console.error("[ahsan] Google OAuth gagal dimulai.", error);
    return refuse(next);
  }

  if (pending.length === 0) {
    // Without a verifier the round trip cannot succeed, and Google would send
    // them back to a failure. Better to stop here than to spend somebody's time
    // proving it.
    console.error("[ahsan] Verifier PKCE tidak dihasilkan; Google OAuth dibatalkan.");
    return refuse(next);
  }

  const response = NextResponse.redirect(data.url);
  for (const { name, value, options } of pending) {
    response.cookies.set(name, value, options);
  }
  return response;
}

function refuse(next: string): NextResponse {
  const failure = new URLSearchParams({ error: "google-gagal" });
  if (next !== "/") failure.set("next", next);
  return sameOriginRedirect(`/signin?${failure}`);
}
