import Link from "next/link";
import { about, landing } from "../content";
import { SiteFooter, SiteHeader, Arrow } from "./shell";
import { ProjectRow } from "./pieces";
import type { ProjectSummary } from "../lib/data";
import { ROLES, roleLabel, roleMeta } from "../lib/roles";
import { boardLink, boardPath } from "../lib/urls";

/**
 * The landing page: the one page here that argues for the site rather than
 * being it.
 *
 * It makes the case in three moves — what this place is, how it works, and
 * what is actually on the board right now — and closes on the invitation. The
 * middle move is the board's own data, not a mock-up: a pitch that shows real
 * projects with real empty roles is checkable, and a visitor who would rather
 * look than read can step straight into one.
 */
export function Landing({
  projects,
  peopleCount,
}: {
  projects: ProjectSummary[];
  peopleCount: number;
}) {
  const openSeats = projects.reduce((total, project) => total + project.openSeatCount, 0);
  const featured = projects.slice(0, 4);
  // Only the roles somebody is genuinely waiting on — a chip that leads to an
  // empty board is a broken promise.
  const wantedRoles = ROLES.filter((role) =>
    projects.some((project) => project.openRoles.includes(role)),
  );

  return (
    <>
      <SiteHeader returnTo="/" />

      <main id="main-content" className="landing">
        <section className="landing-hero">
          <div className="landing-hero-inner">
            <p className="eyebrow light">
              <span /> {landing.eyebrow}
            </p>
            <h1>
              {landing.headingTop}
              <br />
              <em>{landing.headingEm}</em>
            </h1>
            <p className="landing-lead">{landing.lead}</p>

            <div className="landing-actions">
              <Link className="landing-cta" href="/signup">
                {landing.primaryCta} <Arrow />
              </Link>
              <Link className="landing-cta is-quiet" href={boardPath}>
                {landing.secondaryCta} <Arrow />
              </Link>
            </div>
            <p className="landing-reassurance">{landing.reassurance}</p>

            <ul className="landing-stats">
              <li>
                <strong>{projects.length}</strong>
                <span>{landing.stats.projects}</span>
              </li>
              <li>
                <strong>{openSeats}</strong>
                <span>{landing.stats.roles}</span>
              </li>
              <li>
                <strong>{peopleCount}</strong>
                <span>{landing.stats.people}</span>
              </li>
            </ul>
          </div>
        </section>

        {/* The three verbs from the line above, each given its own room. */}
        <section className="landing-pillars" aria-label="Yang bisa kamu lakukan di sini">
          {landing.pillars.map((pillar, index) => (
            <article key={pillar.title}>
              <span className="pillar-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2>{pillar.title}</h2>
              <p>{pillar.body}</p>
            </article>
          ))}
        </section>

        {/* The same four steps the story page tells, so the promise here and
            the explanation there can never drift apart. */}
        <section className="how-section" aria-labelledby="how-heading">
          <h2 id="how-heading">{about.id.howHeading}</h2>
          <ol className="how-list">
            {about.id.how.map((step) => (
              <li key={step.step}>
                <span>{step.step}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link className="primary-button" href="/about">
            Baca ceritanya <Arrow />
          </Link>
        </section>

        <section className="landing-board" aria-labelledby="board-heading">
          <div className="landing-board-head">
            <div>
              <h2 id="board-heading">{landing.boardHeading}</h2>
              <p>{landing.boardNote}</p>
            </div>
            <Link className="ghost-button" href={boardPath}>
              {landing.boardLink} <Arrow />
            </Link>
          </div>

          {featured.length === 0 ? (
            <p className="empty">
              {landing.emptyBoard} <Link href="/new">Taruh idemu</Link>.
            </p>
          ) : (
            <ul className="project-list">
              {featured.map((project, index) => (
                <ProjectRow key={project.id} project={project} rank={index + 1} />
              ))}
            </ul>
          )}

          {wantedRoles.length > 0 ? (
            <div className="landing-roles">
              <p className="section-label">{landing.rolesHeading}</p>
              <ul className="filter-row">
                {wantedRoles.map((role) => (
                  <li key={role}>
                    <Link className="filter-chip" href={boardLink({ role })} title={roleMeta[role].blurb}>
                      {roleLabel(role)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="submit-section" aria-labelledby="join-heading">
          <div>
            <p className="section-label">{landing.closingEyebrow}</p>
            <h2 id="join-heading">{landing.closingHeading}</h2>
          </div>
          <div>
            <p>{landing.closingBody}</p>
            <Link href="/signup">
              {landing.closingCta} <Arrow />
            </Link>
            <p className="landing-signin">
              {landing.closingAlt} <Link href="/signin">{landing.closingAltCta}</Link>.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
