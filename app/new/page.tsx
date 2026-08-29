import type { Metadata } from "next";
import Link from "next/link";
import { signInPath } from "../lib/urls";
import { SiteFooter, SiteHeader } from "../components/shell";
import { CreateForm } from "../components/create-form";
import { currentViewer } from "../lib/session";

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
  title: "Add your project — Ahsan Project",
  description:
    "Paste the link. We read the name, description and icon from the page itself. Everything else is optional and can wait.",
  alternates: { canonical: "/new" },
};

export default async function NewProject() {
  const viewer = await currentViewer();

  return (
    <>
      <SiteHeader returnTo="/new" />

      <main id="main-content" className="page-narrow">
        <p className="eyebrow">
          <span /> Add your project
        </p>
        <h1>Show what you built.</h1>
        {/* One line, because the field below says the rest. */}
        <p className="lede">Paste the link. Everything else is optional.</p>

        {viewer ? (
          <CreateForm />
        ) : (
          <p className="sign-in-callout">
            <Link className="primary-button" href={signInPath("/new")}>
              Sign in to add your project
            </Link>
          </p>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
