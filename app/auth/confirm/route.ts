import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabase } from "../../lib/supabase";
import { safeNextPath } from "../../lib/urls";

/**
 * Where the link in a sign-up or password-reset email lands.
 *
 * Supabase sends one of two shapes depending on the project's email template,
 * and the same address has to accept both:
 *
 * - `?code=…` — the PKCE flow, which is what `@supabase/ssr` uses by default.
 *   The verifier lives in a cookie set when the email was requested, so this
 *   only completes in the browser that asked for it.
 * - `?token_hash=…&type=…` — the one-time token flow, from a template written
 *   against `{{ .TokenHash }}`. It carries no cookie requirement, so it still
 *   works when somebody opens the email on their phone.
 *
 * Either way the exchange happens here, then the person carries on to wherever
 * they were headed before they signed up.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  if (!code && (!tokenHash || !type)) {
    return NextResponse.redirect(new URL("/signin?error=tautan-tidak-lengkap", request.url));
  }

  const supabase = await getSupabase();
  if (!supabase) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash as string });

  if (error) {
    return NextResponse.redirect(new URL("/signin?error=tautan-kedaluwarsa", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
