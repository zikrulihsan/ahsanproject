import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabase } from "../../lib/supabase";
import { safeNextPath } from "../../lib/urls";

/**
 * Where the confirmation link in a sign-up email lands.
 *
 * Exchanges the one-time token for a session, then sends the person on to
 * wherever they were headed before they signed up.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  // Supabase's default email template first verifies the `pkce_…` token on
  // its own server, then redirects here with an authorization code. A custom
  // SSR template can instead send token_hash + type straight here. Support
  // both so changing an email template cannot strand an otherwise valid link.
  if (!code && (!tokenHash || !type)) {
    return NextResponse.redirect(new URL("/signin?error=tautan-tidak-lengkap", request.url));
  }

  const supabase = await getSupabase();
  if (!supabase) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ type: type!, token_hash: tokenHash! });
  if (error) {
    return NextResponse.redirect(new URL("/signin?error=tautan-kedaluwarsa", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
