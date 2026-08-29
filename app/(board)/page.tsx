import type { Metadata } from "next";
import Link from "next/link";
import { homeMeta, shareCard } from "../content";
import { initials } from "../components/pieces";
import { Arrow, SiteFooter, SiteHeader } from "../components/shell";
import { ProjectLogo } from "../components/project-logo";
import { RotatingHeadline } from "../components/rotating-headline";
import { listPeople, listProjects, type Person, type ProjectSummary } from "../lib/data";
import { readPublicly } from "../lib/public-read";
import { projectBlurb } from "../lib/brief";
import { projectTypeLabel } from "../lib/project-types";
import { roleLabel } from "../lib/roles";
import { stageMeta } from "../lib/stages";

export const metadata: Metadata = {
  title: homeMeta.title,
  description: homeMeta.description,
  alternates: { canonical: "/" },
  openGraph: shareCard({ title: homeMeta.title, description: homeMeta.description, url: "/" }),
};

const USE_CASES = [
  "Building in public, so people can see",
  "Finding a collaborator, to grow together",
  "Turning work into a portfolio",
  "Connected by people who need you",
];

const WORKFLOW = [
  ["List a project", "Write down the problem, who it is for, and where the work stands."],
  ["Choose how it lives", "Open a role, or leave the project as a public build log."],
  ["Let people find the work", "Meet collaborators through the project—or find the people you need."],
  ["Ship and keep the proof", "Finished work and real contributions land on your portfolio."],
  ["Become discoverable", "Your profile enters the talent pool with evidence attached."],
] as const;

export default async function Home() {
  const [projectsResult, peopleResult] = await Promise.all([
    readPublicly("projects on the home page", () => listProjects({ lane: "newest" }), []),
    readPublicly("people on the home page", () => listPeople(400), []),
  ]);
  const projects = projectsResult.value;
  const people = peopleResult.value;
  const dataUnavailable = projectsResult.unavailable || peopleResult.unavailable;
  const openRoles = projects.reduce((total, project) => total + project.openSeatCount, 0);

  return (
    <>
      <SiteHeader returnTo="/" active="home" />

      <main id="main-content" className="landing-page">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <RotatingHeadline />
            <p className="landing-hero-lead">
              A public place to list projects for any use case—building in public, finding help,
              proving skill, or getting discovered.
            </p>

            <div className="home-hero-actions" aria-label="Get started with Ahsan Project">
              <Link className="home-hero-primary" href="/new">
                <span aria-hidden="true">+</span> Add a project
              </Link>
              <Link className="home-hero-secondary" href="/explore">
                Browse projects <Arrow />
              </Link>
            </div>

            <div className="landing-counts" aria-label="Current Ahsan Project activity">
              <span className="landing-count">
                <strong>{people.length}</strong>
                <span>people</span>
              </span>
              <span className="landing-count">
                <strong>{projects.length}</strong>
                <span>projects</span>
              </span>
              <span className="landing-count">
                <strong>{openRoles}</strong>
                <span>open roles</span>
              </span>
            </div>
          </div>
        </section>

        {dataUnavailable ? (
          <p className="public-data-notice" role="status">
            Some live data could not be loaded. <Link href="/">Refresh this page</Link>.
          </p>
        ) : null}

        <section className="landing-use-cases" aria-labelledby="use-cases-title">
          <div className="landing-section-intro">
            <p className="home-eyebrow">Why share your project?</p>
            <h2 id="use-cases-title">Put your project where it can be seen.</h2>
            <p className="landing-section-lead">Once you share it, you can:</p>
          </div>

          <div className="use-case-layout">
            <ul className="use-case-list">
              {USE_CASES.map((useCase) => (
                <li key={useCase}><span aria-hidden="true">↗</span>{useCase}</li>
              ))}
            </ul>
          </div>

          <Link className="landing-inline-link" href="/explore">
            See example projects <Arrow />
          </Link>
        </section>

        <section className="landing-project-feature" id="projects" aria-labelledby="project-feature-title">
          <div className="landing-project-feature-head">
            <div>
              <p className="home-eyebrow">01 · Project Showcase</p>
              <h2 id="project-feature-title">One shared project creates multiple opportunities.</h2>
            </div>
          </div>

          <div className="landing-index-filters" aria-label="Example project filters">
            <span>✅ Searchable</span><span>✅ Inspire and get inspired</span><span>✅ Grow with contributors</span><span>✅ Find collaborators</span>
          </div>

          {projects.length > 0 ? (
            <div className="landing-project-index">
              {projects.slice(0, 3).map((project) => <ProjectIndexRow key={project.id} project={project} />)}
            </div>
          ) : (
            <p className="landing-data-empty">No projects yet. Add the first piece of work.</p>
          )}

          <Link className="landing-inline-link" href="/explore">Browse all projects <Arrow /></Link>
        </section>

        <section className="portfolio-story" id="portfolio" aria-labelledby="portfolio-story-title">
          <div className="portfolio-story-copy">
            <p className="home-eyebrow">02 · Portfolio builder</p>
            <h2 id="portfolio-story-title">Tired of maintaining a portfolio on your own?</h2>
            <p>
              Your profile collects projects, contributions, and the roles that actually happened.
              One link that grows every time something ships.
            </p>
            <ul>
              <li><span>01</span> A project-first personal portfolio</li>
              <li><span>02</span> No deployment required</li>
              <li><span>03</span> Skills proven by shipped work</li>
            </ul>
            <a className="portfolio-story-link" href="https://ahsanproject.id/u/zikrul-ihsan">
              See a live portfolio <Arrow />
            </a>
          </div>

          <a
            className="portfolio-preview"
            href="https://ahsanproject.id/u/zikrul-ihsan"
            aria-label="See Zikrul Ihsan's portfolio"
          >
            <div className="portfolio-preview-label">
              <span>WORK-BUILT PORTFOLIO</span>
              <i><b /> Active profile</i>
            </div>
            <div className="portfolio-preview-person">
              <span className="portfolio-preview-avatar" aria-hidden="true">ZI</span>
              <div>
                <h3>Zikrul Ihsan</h3>
                <p>Software Engineer · Community Builder</p>
              </div>
            </div>
            <p className="portfolio-preview-bio">
              Building digital products, communities, and useful public projects.
            </p>
            <ul className="portfolio-preview-skills" aria-label="Zikrul Ihsan's skills">
              <li>5 years</li><li>Python</li><li>AI Engineering</li>
            </ul>
            <div className="portfolio-preview-proof">
              <div><strong>6</strong><span>projects built</span></div>
              <div><span>Selected work</span><p>Swegrowth · Main Aman · CariKontak</p></div>
            </div>
            <span className="portfolio-preview-url"><span>ahsanproject.id/u/zikrul-ihsan</span> <Arrow diagonal /></span>
          </a>
        </section>

        <section className="talent-story" aria-labelledby="talent-story-title">
          <div className="talent-story-copy">
            <p className="home-eyebrow">03 · Talent pool</p>
            <h2 id="talent-story-title">Complete your profile so recruiters can find you.</h2>
            <p>
              Your profile is collected into the talent pool.
              Recruiters, hiring managers, and founders all see the same evidence. Here is how:
            </p>
            <ul>
              <li><span>✓</span> Hiring managers can search by project topic</li>
              <li><span>✓</span> Recruiters can find you through relevant skills and experience</li>
              <li><span>✓</span> Founders can see the depth of your project work</li>
            </ul>
            <Link className="talent-story-link" href="/people">Browse people <Arrow /></Link>
          </div>

          <div className="talent-preview" aria-label="People on Ahsan Project">
            <div className="talent-preview-head">
              <span>People with visible work</span>
              <Link href="/people">View all</Link>
            </div>
            {people.length > 0 ? (
              <ul>
                {people.slice(0, 3).map((person) => <TalentRow key={person.id} person={person} />)}
              </ul>
            ) : (
              <div className="talent-preview-empty"><p>No profiles yet.</p><Link href="/signup">Create yours</Link></div>
            )}
          </div>
        </section>

        <section className="how-it-works" aria-labelledby="how-title">
          <div className="how-heading">
            <div>
              <p className="home-eyebrow">How it fits together</p>
              <h2 id="how-title">How to get started 🏁</h2>
            </div>
            <p>List the work once. The project index, portfolio, and talent pool grow from the same evidence.</p>
          </div>
          <ol className="how-steps how-steps-five">
            {WORKFLOW.map(([title, body], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div className="how-step-mark" aria-hidden="true">{index + 1}</div>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-final-cta" aria-labelledby="final-cta-title">
          <p className="home-eyebrow">Start with the work</p>
          <h2 id="final-cta-title">Put the work where people can see it.</h2>
          <p>Add a project even if it&apos;s still an idea. Update it as it moves.</p>
          <div>
            <Link className="home-hero-primary" href="/new"><span aria-hidden="true">+</span> Add a project</Link>
            <Link className="landing-final-secondary" href="/explore">Find a place to contribute <Arrow /></Link>
          </div>
          <small>Free for the community.</small>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function ProjectIndexRow({ project }: { project: ProjectSummary }) {
  const openRole = project.openRoles[0];
  return (
    <article className="landing-index-row">
      <ProjectLogo title={project.title} website={project.liveUrl} logoUrl={project.logoUrl} />
      <div className="landing-index-main">
        <p>
          <span>{stageMeta[project.stage].label}</span>
          {projectTypeLabel(project.projectType) ? ` · ${projectTypeLabel(project.projectType)}` : ""}
          {project.tags[0] ? ` · ${project.tags[0]}` : ""}
        </p>
        <h3><Link className="card-cover-link" href={`/projects/${project.slug}`}>{project.title}</Link></h3>
        <p>{projectBlurb(project)}</p>
      </div>
      <div className="landing-index-role">
        <small>{openRole ? "Open role" : "Build log"}</small>
        <strong>{openRole ? roleLabel(openRole) : "No role open"}</strong>
      </div>
      <Link className="landing-index-owner" href={`/u/${project.owner.username}`}>
        <span aria-hidden="true">{initials(project.owner.name)}</span>
        <small>{project.owner.name}</small>
      </Link>
    </article>
  );
}

function TalentRow({ person }: { person: Person }) {
  return (
    <li>
      <Link href={`/u/${person.username}`}>
        <span className="talent-avatar" aria-hidden="true">{initials(person.name)}</span>
        <span className="talent-person-copy">
          <strong>{person.name}</strong>
          <small>{person.profession || person.headline || "Builder"}</small>
        </span>
        <span className="talent-skills" aria-label={`${person.name}'s skills`}>
          {person.skills.slice(0, 2).map((skill) => <i key={skill}>{skill}</i>)}
        </span>
        <Arrow />
      </Link>
    </li>
  );
}
