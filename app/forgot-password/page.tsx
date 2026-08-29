import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/shell";
import { ForgotPasswordForm } from "../components/auth-forms";
import { supabaseConfigured } from "../lib/supabase";

export const metadata: Metadata = {
  title: "Forgot password — Ahsan Project",
  description: "Request a link to reset your Ahsan Project account password.",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <SiteHeader returnTo="/forgot-password" />

      <main id="main-content" className="page-narrow auth-page">
        <p className="eyebrow">
          <span /> Forgot password
        </p>
        <h1>No problem.</h1>
        <p className="lede">
          Enter your email address and we will send you a link to set a new password.
        </p>

        {supabaseConfigured() ? (
          <ForgotPasswordForm />
        ) : (
          <p className="form-error">
            This site is not connected to Supabase yet, so passwords cannot be reset.
          </p>
        )}

        <p className="auth-switch">
          Remembered it? <Link href="/signin">Sign in</Link>.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
