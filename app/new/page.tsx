import type { Metadata } from "next";
import Link from "next/link";
import { signInPath } from "../lib/urls";
import { SiteFooter, SiteHeader } from "../components/shell";
import { CreateForm } from "../components/create-form";
import { currentViewer } from "../lib/session";
import { currentLocale } from "../lib/locale-server";
import { tx } from "../lib/locale";

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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  return {
    title: tx(locale, "Tambahkan proyekmu — Ahsan Project", "Add your project — Ahsan Project"),
    description: tx(locale, "Tempel tautannya. Kami membaca nama, deskripsi, dan ikon dari halaman tersebut. Bagian lain bersifat opsional dan dapat diisi nanti.", "Paste the link. We read the name, description and icon from the page itself. Everything else is optional and can wait."),
    alternates: { canonical: "/new" },
  };
}

export default async function NewProject() {
  const [viewer, locale] = await Promise.all([currentViewer(), currentLocale()]);

  return (
    <>
      <SiteHeader returnTo="/new" />

      <main id="main-content" className="page-narrow">
        <p className="eyebrow">
          <span /> {tx(locale, "Tambahkan proyekmu", "Add your project")}
        </p>
        <h1>{tx(locale, "Tampilkan apa yang kamu bangun.", "Show what you built.")}</h1>
        {/* One line, because the field below says the rest. */}
        <p className="lede">{tx(locale, "Tempel tautannya. Bagian lain bersifat opsional.", "Paste the link. Everything else is optional.")}</p>

        {viewer ? (
          <CreateForm />
        ) : (
          <p className="sign-in-callout">
            <Link className="primary-button" href={signInPath("/new")}>
              {tx(locale, "Masuk untuk menambahkan proyek", "Sign in to add your project")}
            </Link>
          </p>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
