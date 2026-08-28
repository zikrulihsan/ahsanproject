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

    // The verifier is written when the sign-in starts and read here, so it is
    // only missing when the journey changed origin along the way — a callback
    // sent to a second name for this site, usually because that name is not on
    // Supabase's redirect allow list. Worth its own sentence: "coba lagi" sends
    // somebody round a loop that cannot succeed.
    destination.searchParams.set(
      "error",
      /verifier|code challenge|code_verifier/i.test(error.message) ? "alamat-beda" : "google-gagal",
    );
  } else {
    destination.searchParams.set("error", "google-gagal");
  }

  if (next !== "/") destination.searchParams.set("next", next);
  return NextResponse.redirect(destination);
}
