import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "../components/shell";
import { SignUpForm } from "../components/auth-forms";
import { viewerId } from "../lib/session";
import { safeNextPath } from "../lib/urls";
import { supabaseConfigured } from "../lib/supabase";

/*
 * Allowed to block.
 *
 * This page decides what to render — or whether to redirect — from who is
 * signed in, and there is no useful shell to show before that answer arrives:
 * a visitor who is about to be sent elsewhere should not watch this page paint
 * first. Nothing here is cacheable and nothing here is indexed, so blocking on
 * the session costs a request that was always going to be per-visitor.
 */
export const instant = false;

export const metadata: Metadata = {
  title: "Create an account — Ahsan Project",
  description: "Create an account to show what you are building and help with other projects.",
  robots: { index: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SignUpPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const next = safeNextPath(typeof params.next === "string" ? params.next : "/");

  // Only whether there is a session, not who it belongs to: this page either
  // bounces them or shows the form, and neither needs a profile.
  if (await viewerId()) redirect(next);

  return (
    <>
      <SiteHeader returnTo="/signup" />

      <main id="main-content" className="page-narrow auth-page">
        <p className="eyebrow">
          <span /> Create an account
        </p>
        <h1>Start with an account.</h1>
        <p className="lede">
          With an account, you can show projects, name the help you need, and contribute to other
          projects. Your profile page doubles as a portfolio.
        </p>

        {supabaseConfigured() ? (
          <SignUpForm next={next} />
        ) : (
          <p className="form-error">
            This site is not connected to Supabase yet, so registration is unavailable.
          </p>
        )}

        <p className="auth-switch">
          Already have an account? <Link href={`/signin?next=${encodeURIComponent(next)}`}>Sign in</Link>.
        </p>
        <p className="auth-privacy-note">
          By creating an account, you agree to our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
