import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/shell";
import { ForgotPasswordForm } from "../components/auth-forms";
import { supabaseConfigured } from "../lib/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lupa kata sandi — Ahsan Project",
  description: "Minta tautan untuk menyetel ulang kata sandi akun Ahsan Project.",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <SiteHeader returnTo="/lupa-password" />

      <main className="page-narrow auth-page">
        <p className="eyebrow">
          <span /> Lupa kata sandi
        </p>
        <h1>Tidak apa-apa.</h1>
        <p className="lede">
          Masukkan emailmu, nanti kami kirim tautan untuk menyetel kata sandi baru.
        </p>

        {supabaseConfigured() ? (
          <ForgotPasswordForm />
        ) : (
          <p className="form-error">
            Situs ini belum tersambung ke Supabase, jadi kata sandi belum bisa disetel ulang.
          </p>
        )}

        <p className="auth-switch">
          Ingat lagi? <Link href="/signin">Masuk saja</Link>.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
