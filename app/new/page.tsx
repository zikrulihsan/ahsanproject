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

      {/* One line, one field, one button. A page whose whole job is to take a
          link should not spend the visitor's attention introducing itself. */}
      <main id="main-content" className="page-narrow new-page">
        <h1>
          Show anything you built. <span>One link is enough.</span>
        </h1>

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
