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
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/signin?error=tautan-tidak-lengkap", request.url));
  }

  const supabase = await getSupabase();
  if (!supabase) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return NextResponse.redirect(new URL("/signin?error=tautan-kedaluwarsa", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
