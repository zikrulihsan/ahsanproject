import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "../components/shell";
import { SignInForm } from "../components/auth-forms";
import { currentViewer } from "../lib/session";
import { safeNextPath } from "../lib/urls";
import { supabaseConfigured } from "../lib/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Masuk — Ahsan Project",
  description: "Masuk untuk menunjukkan projectmu, ikut membahas, dan membantu project orang lain.",
  robots: { index: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Why a confirmation link sent somebody back here. Set by /auth/confirm. */
const LINK_PROBLEMS: Record<string, string> = {
  "tautan-kedaluwarsa": "Tautan konfirmasinya sudah kedaluwarsa atau sudah dipakai. Coba masuk, atau daftar ulang kalau belum jadi.",
  "tautan-tidak-lengkap": "Tautan konfirmasinya tidak lengkap. Buka lagi tautan dari emailnya secara utuh.",
};

export default async function SignInPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const next = safeNextPath(typeof params.next === "string" ? params.next : "/");

  const viewer = await currentViewer();
  if (viewer) redirect(next);

  const linkProblem = typeof params.error === "string" ? LINK_PROBLEMS[params.error] : undefined;

  return (
    <>
      <SiteHeader returnTo="/signin" />

      <main id="main-content" className="page-narrow auth-page">
        <p className="eyebrow">
          <span /> Masuk
        </p>
        <h1>Selamat datang lagi.</h1>
        <p className="lede">Masuk untuk menunjukkan projectmu, ikut membahas, dan ikut membantu.</p>

        {linkProblem ? (
          <p className="form-error" role="alert">
            {linkProblem}
          </p>
        ) : null}

        {supabaseConfigured() ? (
          <SignInForm next={next} />
        ) : (
          <p className="form-error">
            Situs ini belum tersambung ke Supabase, jadi masuk belum bisa. Papannya tetap bisa
            dibaca.
          </p>
        )}

        <p className="auth-switch">
          Belum punya akun? <Link href={`/signup?next=${encodeURIComponent(next)}`}>Daftar dulu</Link>.
          {" · "}
          <Link href="/lupa-password">Lupa kata sandi?</Link>
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
