import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "../../lib/supabase";
import { safeNextPath, startPath } from "../../lib/urls";

/** Exchanges Google's short-lived OAuth code for the session cookies used by the app. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const supabase = await getSupabase();

  const destination = new URL("/signin", request.url);

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(startPath(next), request.url));

    // A code is single use, and a successful exchange clears the verifier it
    // was spent against. So the second visit to this URL — a refresh, a retry,
    // a browser replaying the navigation — fails in a way that looks exactly
    // like a sign-in that never worked. Ask who is here before believing that:
    // if a session exists, the exchange already happened and there is nothing
    // wrong to report.
    const { data } = await supabase.auth.getUser();
    if (data.user) return NextResponse.redirect(new URL(startPath(next), request.url));

    // Past that, the exchange genuinely failed. Say what Supabase said — the
    // message is the only way to tell these apart from the outside, and
    // guessing from the shape of it is how the wrong sentence gets shown.
    console.error(`[ahsan] Penukaran kode OAuth gagal: ${error.message}`, {
      code: error.code,
      status: error.status,
      origin: request.nextUrl.origin,
    });

    // Only when the verifier is missing *and* nobody is signed in has the
    // journey plausibly changed origin along the way — the cookie is written
    // where the sign-in started and read here.
    const missingVerifier = /code[ _]verifier/i.test(error.message);
    destination.searchParams.set("error", missingVerifier ? "alamat-beda" : "google-gagal");
  } else {
    destination.searchParams.set("error", "google-gagal");
  }

  if (next !== "/") destination.searchParams.set("next", next);
  return NextResponse.redirect(destination);
}
