import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "../components/shell";
import { SignUpForm } from "../components/auth-forms";
import { currentViewer } from "../lib/session";
import { safeNextPath } from "../lib/urls";
import { supabaseConfigured } from "../lib/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daftar — Ahsan Project",
  description: "Bikin akun untuk menunjukkan yang sedang kamu bangun dan ikut membantu project orang lain.",
  robots: { index: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SignUpPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const next = safeNextPath(typeof params.next === "string" ? params.next : "/");

  const viewer = await currentViewer();
  if (viewer) redirect(next);

  return (
    <>
      <SiteHeader returnTo="/signup" />

      <main id="main-content" className="page-narrow auth-page">
        <p className="eyebrow">
          <span /> Daftar
        </p>
        <h1>Bikin akun dulu.</h1>
        <p className="lede">
          Setelah punya akun, kamu bisa menunjukkan project, menyebut bantuan yang dicari, dan ikut membantu project orang
          lain. Halaman profilmu sekalian jadi portofolio.
        </p>

        {supabaseConfigured() ? (
          <SignUpForm next={next} />
        ) : (
          <p className="form-error">
            Situs ini belum tersambung ke Supabase, jadi pendaftaran belum bisa dibuka.
          </p>
        )}

        <p className="auth-switch">
          Sudah punya akun? <Link href={`/signin?next=${encodeURIComponent(next)}`}>Masuk saja</Link>.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
