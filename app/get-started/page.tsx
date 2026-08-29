import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { setNow } from "../actions";
import { SiteFooter, SiteHeader } from "../components/shell";
import { StageBadge } from "../components/pieces";
import { ProjectLogo } from "../components/project-logo";
import { SubmitButton } from "../components/submit-button";
import { MAXIMUM } from "../lib/brief";
import { getPortfolio, type ProjectSummary } from "../lib/data";
import { nextSteps, remainingSteps, type NextStep } from "../lib/next-steps";
import { currentViewer } from "../lib/session";
import { signInPath } from "../lib/urls";

/*
 * Allowed to block — same reason as /inbox. The whole page is one person's
 * own state, there is nothing cacheable to paint before knowing who is asking,
 * and a visitor about to be redirected should not watch it render first.
 */
export const instant = false;

export const metadata: Metadata = {
  title: "Next steps — Ahsan Project",
  description: "What remains to make your projects visible and your profile discoverable.",
  robots: { index: false },
};

/**
 * Where signing in lands, until there is nothing left to do here.
 *
 * A named list, not a progress bar: `docs/redesign-showcase.md` threw the
 * brief's completeness percentage out because a number turns a story into a
 * form to finish, and that argument does not stop being true one page over.
 * Each line says what it is for and links straight at the thing that does it.
 *
 * Nothing here blocks anybody. Every step can be skipped, and once none are
 * owed the page forwards to the board instead of standing in the way of every
 * future sign-in — `?all=1` keeps it reachable on purpose from the menu.
 */
export default async function StartPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await currentViewer();
  if (!viewer) redirect(signInPath("/get-started"));

  const query = (await searchParams) ?? {};
  const keepOpen = query.all === "1";

  const { owned, contributing } = await getPortfolio(viewer);
  const steps = nextSteps({ person: viewer, owned, contributing });
  const remaining = remainingSteps(steps);
  if (remaining.length === 0 && !keepOpen) redirect("/");

  const [owed, extras] = [steps.filter((step) => !step.optional), steps.filter((step) => step.optional)];
  const firstName = viewer.name.split(" ")[0];

  return (
    <>
      <SiteHeader returnTo="/get-started" />

      <main id="main-content" className="page-narrow start-page">
        <p className="eyebrow">
          <span /> Next steps
        </p>
        <h1>Hello, {firstName}.</h1>
        <p className="lede">
          {remaining.length === 0
            ? "You have completed all the steps. Use the options below to update them again."
            : `${remaining.length} steps remain to make your projects visible and your profile discoverable. None are required right now.`}
        </p>

        <ol className="next-steps">
          {owed.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}
        </ol>

        {extras.length > 0 ? (
          <section className="next-step-optional" aria-labelledby="optional-heading">
            <h2 id="optional-heading" className="section-title">
              If you need it
            </h2>
            <ol className="next-steps">
              {extras.map((step) => (
                <StepRow key={step.id} step={step} />
              ))}
            </ol>
          </section>
        ) : null}

        <section aria-labelledby="projects-heading">
          <h2 id="projects-heading" className="section-title">
            Your projects
          </h2>

          {owned.length === 0 ? (
            <p className="muted">
              Nothing here yet. <Link href="/new">Show your first project</Link>—an idea is enough.
            </p>
          ) : (
            <ul className="start-project-list">
              {owned.map((project) => (
                <StartProjectRow key={project.id} project={project} />
              ))}
            </ul>
          )}
        </section>

        <p className="start-skip">
          <Link href="/">Skip for now and browse the board</Link>
        </p>
      </main>

      <SiteFooter />
    </>
  );
}

function StepRow({ step }: { step: NextStep }) {
  return (
    <li className={`next-step ${step.done ? "is-done" : ""}`}>
      <span className="next-step-mark" aria-hidden="true">
        {step.done ? "✓" : ""}
      </span>
      <div className="next-step-copy">
        <h3>
          {step.title}
          {step.done ? <span className="next-step-state"> · done</span> : null}
        </h3>
        <p>{step.blurb}</p>
      </div>
      <Link className="next-step-cta" href={step.href}>
        {step.done ? "Edit" : step.cta}
      </Link>
    </li>
  );
}

/**
 * One owned project with the three things its owner most often comes back for.
 *
 * The "sekarang sedang…" line is edited here rather than linked to, because it
 * otherwise lives inside a collapsed panel inside a tab on the project page —
 * far enough away that the line people read for freshness is the one least
 * likely to be kept fresh. `setNow` is the same action that panel calls.
 */
function StartProjectRow({ project }: { project: ProjectSummary }) {
  return (
    <li className="start-project-row">
      <div className="start-project-head">
        <ProjectLogo title={project.title} website={project.liveUrl} logoUrl={project.logoUrl} />
        <div className="start-project-title">
          <h3>
            <Link href={`/projects/${project.slug}`}>{project.title}</Link>
          </h3>
          <StageBadge stage={project.stage} />
        </div>
        <Link className="start-project-edit" href={`/projects/${project.slug}/edit`}>
          Edit brief
        </Link>
      </div>

      <form className="start-now-form" action={setNow}>
        <input type="hidden" name="slug" value={project.slug} />
        <label htmlFor={`now-${project.slug}`}>Working on now…</label>
        <div className="start-now-row">
          <input
            id={`now-${project.slug}`}
            name="now"
            type="text"
            maxLength={MAXIMUM.now}
            defaultValue={project.nowText}
            placeholder="For example: Drafting the first safety materials."
          />
          <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
        </div>
      </form>

      <p className="start-project-seats">
        {project.openSeatCount > 0
          ? `${project.openSeatCount} open roles.`
          : "No open roles yet."}{" "}
        <Link href={`/projects/${project.slug}?tab=collaboration`}>
          {project.openSeatCount > 0 ? "View collaboration" : "Open a role"}
        </Link>
      </p>
    </li>
  );
}
