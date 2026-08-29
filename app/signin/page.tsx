import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "../components/shell";
import { SignInForm } from "../components/auth-forms";
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
  title: "Sign in — Ahsan Project",
  description: "Sign in to show your projects, join discussions, and help build other people's projects.",
  robots: { index: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Why a confirmation link sent somebody back here. Set by /auth/confirm. */
const LINK_PROBLEMS: Record<string, string> = {
  "tautan-kedaluwarsa": "This confirmation link has expired or has already been used. Try signing in, or create a new account if needed.",
  "tautan-tidak-lengkap": "This confirmation link is incomplete. Open the complete link from your email again.",
  "google-gagal": "Google sign-in did not work. Please try again or use email instead.",
  "alamat-beda":
    "Sign-in started at one address and returned to another, so the session could not be created. " +
    "Open the site at its primary address and try again. Site administrators should register " +
    "/auth/callback and /auth/confirm for each address in Supabase → Authentication → URL Configuration.",
};

export default async function SignInPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const next = safeNextPath(typeof params.next === "string" ? params.next : "/");

  // Only whether there is a session, not who it belongs to: this page either
  // bounces them or shows the form, and neither needs a profile.
  if (await viewerId()) redirect(next);

  const linkProblem = typeof params.error === "string" ? LINK_PROBLEMS[params.error] : undefined;

  return (
    <>
      <SiteHeader returnTo="/signin" />

      <main id="main-content" className="signin-page">
        <section className="signin-story" aria-labelledby="signin-story-title">
          <div className="signin-story-copy">
            <p className="eyebrow">
              <span /> A place for projects in motion
            </p>
            <h1 id="signin-story-title">Back to what you are building.</h1>
            <p>
              See the latest updates, respond to people who want to help, and keep your project
              moving from one place.
            </p>
          </div>

          <div className="signin-preview" aria-label="Ahsan Project activity preview">
            <div className="signin-preview-top">
              <span>Project activity</span>
              <small>Today</small>
            </div>
            <div className="signin-preview-project">
              <span className="signin-preview-logo" aria-hidden="true">WA</span>
              <span>
                <strong>Warung Antre</strong>
                <small>Testing the first flow</small>
              </span>
              <span className="signin-preview-status">Building</span>
            </div>
            <div className="signin-preview-update">
              <span className="signin-preview-check" aria-hidden="true">✓</span>
              <p>
                <strong>A new step is complete</strong>
                <span>The seller screen sketch is ready for discussion.</span>
              </p>
            </div>
            <div className="signin-preview-people">
              <span className="signin-preview-avatars" aria-hidden="true">
                <i>ZI</i><i>NA</i><i>RF</i>
              </span>
              <span>Projects meet the right people.</span>
            </div>
          </div>
        </section>

        <section className="signin-panel" aria-labelledby="signin-heading">
          <div className="signin-card">
            <p className="signin-kicker">Sign in to your account</p>
            <h2 id="signin-heading">Welcome back.</h2>
            <p className="signin-card-lede">Choose the fastest way to continue.</p>

            {linkProblem ? (
              <p className="form-error" role="alert">
                {linkProblem}
              </p>
            ) : null}

            {supabaseConfigured() ? (
              <SignInForm next={next} />
            ) : (
              <>
                <p className="form-error">
                  This site is not connected to Supabase yet, so sign-in is unavailable. You can
                  still browse the board.
                </p>
                <p className="signin-fallback-link">
                  <Link href="/lupa-password">Forgot your password?</Link>
                </p>
              </>
            )}

            <p className="auth-switch">
              New to Ahsan Project?{" "}
              <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link>
            </p>
            <p className="signin-privacy">
              When you use Google, we only receive your name, email address, and profile photo.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
