import type { Metadata } from "next";
import Link from "next/link";
import { homeMeta, shareCard } from "../content";
import { initials } from "../components/pieces";
import { Arrow, SiteFooter, SiteHeader } from "../components/shell";
import { ProjectLogo } from "../components/project-logo";
import { RotatingHeadline } from "../components/rotating-headline";
import { listPeople, listProjects, type Person, type ProjectSummary } from "../lib/data";
import { readPublicly } from "../lib/public-read";
import { roleLabel } from "../lib/roles";
import { stageMeta } from "../lib/stages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: homeMeta.title,
  description: homeMeta.description,
  alternates: { canonical: "/" },
  openGraph: shareCard({ title: homeMeta.title, description: homeMeta.description, url: "/" }),
};

const USE_CASES = [
  "Building in public",
  "Finding a collaborator",
  "Showing a student or side project",
  "Hiring help for a specific role",
  "Turning work into a portfolio",
  "Getting found by people who need your skill",
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
    readPublicly("project beranda", () => listProjects({ lane: "terbaru" }), []),
    readPublicly("orang di beranda", () => listPeople(400), []),
  ]);
  const projects = projectsResult.value;
  const people = peopleResult.value;
  const dataUnavailable = projectsResult.unavailable || peopleResult.unavailable;
  const openRoles = projects.reduce((total, project) => total + project.openSeatCount, 0);

  return (
    <>
      <SiteHeader returnTo="/" active="beranda" />

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
              <Link className="home-hero-secondary" href="/kolaborasi">
                Browse projects <Arrow />
              </Link>
            </div>

            <p className="landing-counts" aria-label="Current Ahsan Project activity">
              <strong>{people.length}</strong> people <i /> <strong>{projects.length}</strong> projects
              <i /> <strong>{openRoles}</strong> open roles
            </p>
          </div>
        </section>

        {dataUnavailable ? (
          <p className="public-data-notice" role="status">
            Some live data could not be loaded. <Link href="/">Refresh this page</Link>.
          </p>
        ) : null}

        <section className="landing-use-cases" aria-labelledby="use-cases-title">
          <div className="landing-section-intro">
            <p className="home-eyebrow">The reason why</p>
            <h2 id="use-cases-title">Once you show your project:</h2>
            <p>Once you show your project, you will get all of these benefit:</p>
          </div>

          <div className="use-case-layout">
            <ul className="use-case-list">
              {USE_CASES.map((useCase) => (
                <li key={useCase}><span aria-hidden="true">↗</span>{useCase}</li>
              ))}
            </ul>
            <aside className="project-brief-note">
              <span>One shared project brief</span>
              <p>Problem · who it&apos;s for · status · what help is open</p>
              <small>Enough context for someone to understand the work before they contact you.</small>
            </aside>
          </div>

          <Link className="landing-inline-link" href="/kolaborasi">
            See example projects <Arrow />
          </Link>
        </section>

        <section className="landing-project-feature" id="projects" aria-labelledby="project-feature-title">
          <div className="landing-project-feature-head">
            <div>
              <p className="home-eyebrow">01 · Project list</p>
              <h2 id="project-feature-title">A living list of work, not a graveyard of ideas.</h2>
            </div>
            <p>
              Every entry shows status, a one-line purpose, an open role, and its owner. It is
              closer to an index of work than a social feed.
            </p>
          </div>

          <div className="landing-index-filters" aria-label="Example project filters">
            <span>Topic</span><span>Status</span><span>Looking for help</span><span>Not looking</span>
          </div>

          {projects.length > 0 ? (
            <div className="landing-project-index">
              {projects.slice(0, 3).map((project) => <ProjectIndexRow key={project.id} project={project} />)}
            </div>
          ) : (
            <p className="landing-data-empty">No projects yet. Add the first piece of work.</p>
          )}

          <Link className="landing-inline-link" href="/kolaborasi">Browse all projects <Arrow /></Link>
        </section>

        <section className="portfolio-story" id="portfolio" aria-labelledby="portfolio-story-title">
          <div className="portfolio-story-copy">
            <p className="home-eyebrow">02 · Portfolio builder</p>
            <h2 id="portfolio-story-title">Don&apos;t write a portfolio. Let the work write it.</h2>
            <p>
              Your profile collects projects, contributions, and the roles that actually happened.
              One link that grows every time something ships.
            </p>
            <ul>
              <li><span>01</span> Projects you started</li>
              <li><span>02</span> Roles you took on other projects</li>
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
            <h2 id="talent-story-title">Find people by the work they&apos;ve done, not the title they claim.</h2>
            <p>
              Search by project topic, role taken, skill used, or availability. Recruiters,
              founders, and collaborators all see the same evidence.
            </p>
            <ul>
              <li><span>✓</span> Project topic and shipped work</li>
              <li><span>✓</span> Roles taken and skills used</li>
              <li><span>✓</span> Current collaboration availability</li>
            </ul>
            <Link className="talent-story-link" href="/orang">Browse people <Arrow /></Link>
          </div>

          <div className="talent-preview" aria-label="People on Ahsan Project">
            <div className="talent-preview-head">
              <span>People with visible work</span>
              <Link href="/orang">View all</Link>
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
              <h2 id="how-title">One project powers three surfaces.</h2>
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

        <section className="landing-proof-strip" aria-labelledby="proof-title">
          <div className="proof-strip-heading">
            <p className="home-eyebrow">Live proof</p>
            <h2 id="proof-title">This is already running—not a concept.</h2>
          </div>
          <div className="proof-strip-projects" aria-label="Live projects">
            {projects.slice(0, 3).map((project) => (
              <Link key={project.id} href={`/projects/${project.slug}`}>
                <ProjectLogo title={project.title} website={project.liveUrl} logoUrl={project.logoUrl} />
                <span><strong>{project.title}</strong><small>{stageMeta[project.stage].label}</small></span>
                <Arrow />
              </Link>
            ))}
          </div>
          <div className="proof-strip-people" aria-label="People with public work">
            {people.slice(0, 3).map((person) => (
              <Link key={person.id} href={`/u/${person.username}`}>
                <span className="talent-avatar" aria-hidden="true">{initials(person.name)}</span>
                <span><strong>{person.name}</strong><small>{person.profession || "Builder"}</small></span>
              </Link>
            ))}
          </div>
        </section>

        <section className="landing-final-cta" aria-labelledby="final-cta-title">
          <p className="home-eyebrow">Start with the work</p>
          <h2 id="final-cta-title">Put the work where people can see it.</h2>
          <p>Add a project even if it&apos;s still an idea. Update it as it moves.</p>
          <div>
            <Link className="home-hero-primary" href="/new"><span aria-hidden="true">+</span> Add a project</Link>
            <Link className="landing-final-secondary" href="/kolaborasi">Find a place to contribute <Arrow /></Link>
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
        <p><span>{stageMeta[project.stage].label}</span>{project.tags[0] ? ` · ${project.tags[0]}` : ""}</p>
        <h3><Link className="card-cover-link" href={`/projects/${project.slug}`}>{project.title}</Link></h3>
        <p>{project.tagline}</p>
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
