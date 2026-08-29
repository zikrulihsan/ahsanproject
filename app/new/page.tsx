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
  title: "Show your project — Ahsan Project",
  description:
    "Write down your idea, the problem it solves, and who it is for. Then open a role if you need collaborators.",
  alternates: { canonical: "/new" },
};

export default async function NewProject() {
  const viewer = await currentViewer();

  return (
    <>
      <SiteHeader returnTo="/new" />

      <main id="main-content" className="page-narrow">
        <p className="eyebrow">
          <span /> Show your project
        </p>
        {viewer ? (
          <>
            <h1>Create your project page.</h1>
            <p className="lede">
              Add what you know now—an idea is enough. A short brief helps people understand it
              and decide whether they can contribute.
            </p>
            <CreateForm />
          </>
        ) : (
          <>
            <h1>Show what you are building.</h1>
            <p className="lede">
              An idea, a work in progress, or something people already use—it all belongs here.
              Write a short brief, then ask for help if you need it.
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
                Sign in to show your project
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
    title: "Describe the project",
    body: "Share the problem, your proposed solution, and the people it is for.",
  },
  {
    step: "02",
    title: "Show what is happening now",
    body: "A short update gives visitors a clear picture of where the work stands.",
  },
  {
    step: "03",
    title: "Invite the right help",
    body: "Open a role when you need a collaborator, and explain the work involved.",
  },
];
