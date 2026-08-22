import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../../components/shell";
import { NewPasswordForm } from "../../components/auth-forms";
import { currentViewer } from "../../lib/session";
import { supabaseConfigured } from "../../lib/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kata sandi baru — Ahsan Project",
  description: "Setel kata sandi baru untuk akun Ahsan Project.",
  robots: { index: false },
};

/**
 * Where a recovery link lands, by way of /auth/confirm.
 *
 * A signed-in visitor here is either somebody who just opened that link, or
 * somebody changing their password on purpose — the same form serves both.
 * Without a session there is nothing to change, so this explains rather than
 * redirecting: being bounced to the sign-in page with no word about why is
 * how an expired link turns into a person giving up.
 */
export default async function NewPasswordPage() {
  const viewer = await currentViewer();

  return (
    <>
      <SiteHeader returnTo="/akun/password" />

      <main className="page-narrow auth-page">
        <p className="eyebrow">
          <span /> Kata sandi
        </p>
        <h1>Setel yang baru.</h1>

        {!supabaseConfigured() ? (
          <p className="form-error">
            Situs ini belum tersambung ke Supabase, jadi kata sandi belum bisa disetel.
          </p>
        ) : viewer ? (
          <>
            <p className="lede">
              Setelah disimpan, kata sandi lamamu tidak berlaku lagi.
            </p>
            <NewPasswordForm />
          </>
        ) : (
          <>
            <p className="form-error" role="alert">
              Tautannya sudah kedaluwarsa atau sudah dipakai, jadi belum ada yang bisa diubah.
            </p>
            <p className="auth-switch">
              <Link href="/lupa-password">Minta tautan baru</Link>.
            </p>
          </>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
