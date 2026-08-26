import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "../../lib/supabase";
import { safeNextPath } from "../../lib/urls";

/** Exchanges Google's short-lived OAuth code for the session cookies used by the app. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const supabase = await getSupabase();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  const destination = new URL("/signin", request.url);
  destination.searchParams.set("error", "google-gagal");
  if (next !== "/") destination.searchParams.set("next", next);
  return NextResponse.redirect(destination);
}
