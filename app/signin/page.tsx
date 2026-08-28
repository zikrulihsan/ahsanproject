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
  title: "Masuk — Ahsan Project",
  description: "Masuk untuk menunjukkan projectmu, ikut membahas, dan membantu project orang lain.",
  robots: { index: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Why a confirmation link sent somebody back here. Set by /auth/confirm. */
const LINK_PROBLEMS: Record<string, string> = {
  "tautan-kedaluwarsa": "Tautan konfirmasinya sudah kedaluwarsa atau sudah dipakai. Coba masuk, atau daftar ulang kalau belum jadi.",
  "tautan-tidak-lengkap": "Tautan konfirmasinya tidak lengkap. Buka lagi tautan dari emailnya secara utuh.",
  "google-gagal": "Masuk dengan Google belum berhasil. Coba sekali lagi, atau gunakan email.",
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
              <span /> Ruang untuk project yang bergerak
            </p>
            <h1 id="signin-story-title">Kembali ke hal yang sedang kamu bangun.</h1>
            <p>
              Lihat kabar terbaru, jawab orang yang ingin membantu, dan lanjutkan projectmu
              dari satu tempat.
            </p>
          </div>

          <div className="signin-preview" aria-label="Gambaran aktivitas di Ahsan Project">
            <div className="signin-preview-top">
              <span>Aktivitas project</span>
              <small>Hari ini</small>
            </div>
            <div className="signin-preview-project">
              <span className="signin-preview-logo" aria-hidden="true">WA</span>
              <span>
                <strong>Warung Antre</strong>
                <small>Sedang menguji alur pertama</small>
              </span>
              <span className="signin-preview-status">Building</span>
            </div>
            <div className="signin-preview-update">
              <span className="signin-preview-check" aria-hidden="true">✓</span>
              <p>
                <strong>Satu langkah baru selesai</strong>
                <span>Sketsa layar penjual sudah siap dibahas.</span>
              </p>
            </div>
            <div className="signin-preview-people">
              <span className="signin-preview-avatars" aria-hidden="true">
                <i>ZI</i><i>NA</i><i>RF</i>
              </span>
              <span>Project bertemu orang yang tepat.</span>
            </div>
          </div>
        </section>

        <section className="signin-panel" aria-labelledby="signin-heading">
          <div className="signin-card">
            <p className="signin-kicker">Masuk ke akunmu</p>
            <h2 id="signin-heading">Selamat datang lagi.</h2>
            <p className="signin-card-lede">Pilih cara paling cepat untuk melanjutkan.</p>

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
                  Situs ini belum tersambung ke Supabase, jadi masuk belum bisa. Papannya tetap bisa
                  dibaca.
                </p>
                <p className="signin-fallback-link">
                  <Link href="/lupa-password">Lupa kata sandi?</Link>
                </p>
              </>
            )}

            <p className="auth-switch">
              Baru di Ahsan Project?{" "}
              <Link href={`/signup?next=${encodeURIComponent(next)}`}>Buat akun</Link>
            </p>
            <p className="signin-privacy">
              Saat memakai Google, kami hanya menerima nama, email, dan foto profilmu.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
