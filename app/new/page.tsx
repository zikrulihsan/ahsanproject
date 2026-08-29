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
        {viewer ? (
          <>
            <h1>Paste the link. That is the whole form.</h1>
            <p className="lede">
              We read the name, the description and the icon from the page itself. Everything
              else—the brief, the topics, the role you are looking for—is optional, and you can add
              it any time after the project is up.
            </p>
            <CreateForm />
          </>
        ) : (
          <>
            <h1>Adding a project takes one link.</h1>
            <p className="lede">
              An idea, a work in progress, or something people already use—it all belongs here.
              Paste the link and the project is up; the rest can be filled in whenever you want.
            </p>

            <ol className="how-list">
              {guestSteps.map((step) => (
                <li key={step.step}>
                  <span>{step.step}</span>
                  <div>
                    <h2>{step.title}</h2>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="sign-in-callout">
              <Link className="primary-button" href={signInPath("/new")}>
                Sign in and paste your link
              </Link>
            </p>
          </>
        )}
      </main>

      <SiteFooter />
    </>
  );
}

const guestSteps = [
  {
    step: "01",
    title: "Paste the link",
    body: "A website, an app listing, or a repository. We read the name, description and icon from the page.",
  },
  {
    step: "02",
    title: "Say what is interesting about it",
    body: "Optional, one or two sentences, and the one thing a link cannot tell us on its own.",
  },
  {
    step: "03",
    title: "Add the rest whenever you want",
    body: "The brief, the topics, and the role you are looking for all wait on the project page, not on this form.",
  },
];
