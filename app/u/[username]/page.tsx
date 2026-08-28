import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { setActivityVisibility } from "../../actions";
import { SiteFooter, SiteHeader } from "../../components/shell";
import { ActivityList, ProjectCard, ProjectIconLink, monthYear } from "../../components/pieces";
import { LinkIcon, type LinkIconKind } from "../../components/link-icons";
import { PageScrollTop } from "../../components/project-scroll-top";
import { ShareProfileButton } from "../../components/share-profile-button";
import { SubmitButton } from "../../components/submit-button";
import {
  getPerson,
  getPersonStats,
  getPortfolio,
  listPersonActivity,
  type Contribution,
  type Person,
  type ProjectSummary,
} from "../../lib/data";
import { EVENT_KINDS, HIGHLIGHT_KINDS, eventKindMeta } from "../../lib/activity";
import { domainOf } from "../../lib/brief";
import { nextSteps, remainingSteps } from "../../lib/next-steps";
import { currentViewer } from "../../lib/session";

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username } = await params;
  const person = await getPerson(username);
  if (!person) return { title: "Orang tidak ditemukan — Ahsan Project" };

  const description =
    person.headline || `Yang sedang dibangun ${person.name}, dan yang dia bantu, di Ahsan Project.`;

  return {
    title: `${person.name} — Ahsan Project`,
    description,
    alternates: { canonical: `/u/${person.username}` },
    // The card image comes from opengraph-image.tsx beside this file.
    openGraph: {
      type: "profile",
      title: `${person.name} — Ahsan Project`,
      description,
      url: `/u/${person.username}`,
    },
  };
}

const TRAIL_PAGE = 40;

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { username } = await params;
  const query = (await searchParams) ?? {};
  const [person, viewer] = await Promise.all([getPerson(username), currentViewer()]);
  if (!person) notFound();

  // "Muat lebih lama" grows the limit instead of paging cursors: the list is
  // one request either way, and the URL stays shareable.
  const showAll = query.jejak === "semua";
  const rawLimit = Number(Array.isArray(query.batas) ? query.batas[0] : query.batas);
  const limit = Math.min(Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : TRAIL_PAGE, 400);

  const isSelf = viewer?.id === person.id;
  const [{ owned, contributing }, activity, stats] = await Promise.all([
    getPortfolio(person),
    listPersonActivity(person.id, {
      limit: limit + 1,
      kinds: showAll ? undefined : HIGHLIGHT_KINDS,
      viewer,
    }),
    getPersonStats(person.id, viewer),
  ]);
  const hasOlder = activity.length > limit;
  const trail = activity.slice(0, limit);
  const profileProjects = Array.from(
    new Map([...owned, ...contributing].map((project) => [project.id, project])).values(),
  );
  const website = safeWebUrl(person.website);
  const github = safeWebUrl(person.github);
  const linkedin = safeWebUrl(person.linkedin);
  const x = safeWebUrl(person.x);
  const resume = safeWebUrl(person.resume);
  const publicEmail = safePublicEmail(person.publicEmail);
  const contacts: Array<{ href: string; icon: LinkIconKind; label: string; external: boolean }> = [
    ...(website
      ? [{ href: website, icon: "website" as const, label: domainOf(website) || "Website", external: true }]
      : []),
    ...(publicEmail
      ? [{ href: `mailto:${publicEmail}`, icon: "email" as const, label: publicEmail, external: false }]
      : []),
    ...(github
      ? [{ href: github, icon: "github" as const, label: "GitHub", external: true }]
      : []),
    ...(linkedin
      ? [{ href: linkedin, icon: "linkedin" as const, label: "LinkedIn", external: true }]
      : []),
    ...(x
      ? [{ href: x, icon: "x" as const, label: "X", external: true }]
      : []),
  ];

  const trailPath = (next: { jejak?: string; batas?: number }) => {
    const params = new URLSearchParams();
    if (next.jejak === "semua") params.set("jejak", "semua");
    if (next.batas && next.batas > TRAIL_PAGE) params.set("batas", String(next.batas));
    const search = params.toString();
    return `/u/${person.username}${search ? `?${search}` : ""}#activity-heading`;
  };

  return (
    <>
      <PageScrollTop />
      <SiteHeader returnTo={`/u/${person.username}`} />

      <section className="profile-band">
        <div className="profile-band-inner profile-hero">
          <ShareProfileButton name={person.name} path={`/u/${person.username}`} />
          <div className="profile-hero-top">
            <div className="profile-hero-copy">
              <p className="eyebrow light">
                <span /> Portofolio Personal
              </p>
              <h1>{person.name}</h1>
              {person.profession ? <p className="profile-profession">{person.profession}</p> : null}
              {person.headline ? <p className="profile-headline">{person.headline}</p> : null}

              {contacts.length > 0 ? (
                <ul className="profile-contact-list" aria-label={`Tautan ${person.name}`}>
                  {contacts.map((contact) => (
                    <li key={`${contact.icon}-${contact.href}`}>
                      <a
                        href={contact.href}
                        target={contact.external ? "_blank" : undefined}
                        rel={contact.external ? "noreferrer" : undefined}
                      >
                        <LinkIcon kind={contact.icon} />
                        <span>{contact.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {resume ? (
                <div className="profile-hero-actions">
                  <a className="profile-resume-link" href={resume} target="_blank" rel="noreferrer">
                    <LinkIcon kind="resume" />
                    <span>Unduh Resume</span>
                  </a>
                </div>
              ) : null}
            </div>

            <aside className="profile-contributions" aria-labelledby="projects-heading">
              <p id="projects-heading" className="profile-summary-label">Projects:</p>
              {profileProjects.length > 0 ? (
                <ul className="profile-project-icon-list">
                  {profileProjects.map((project) => (
                    <ProjectIconLink key={project.id} project={project} />
                  ))}
                </ul>
              ) : (
                <p className="profile-contribution-empty">Belum ada project yang tercatat.</p>
              )}
            </aside>
          </div>

          <section className="profile-summary" aria-label="Ringkasan profil">
            <div className="profile-summary-copy">
              <p className="profile-summary-label">Ringkasan</p>
              {person.bio ? <p className="profile-bio">{person.bio}</p> : null}
            </div>
            <div className="profile-summary-meta">
              {person.skills.length > 0 || person.fields.length > 0 || person.yearsExperience !== null ? (
                <ul className="profile-tags" aria-label="Keahlian dan pengalaman">
                  {person.yearsExperience !== null ? <li>{person.yearsExperience} th pengalaman</li> : null}
                  {person.fields.map((field) => <li key={`field-${field}`}>{field}</li>)}
                  {person.skills.slice(0, 6).map((skill) => <li key={`skill-${skill}`}>{skill}</li>)}
                </ul>
              ) : null}
              <ul className="profile-stats">
                <li>
                  <strong>{owned.length}</strong>
                  <span>project dibangun</span>
                </li>
                {contributing.length > 0 ? (
                  <li>
                    <strong>{contributing.length}</strong>
                    <span>ikut membantu</span>
                  </li>
                ) : null}
                {stats.tasksDone > 0 ? (
                  <li>
                    <strong>{stats.tasksDone}</strong>
                    <span>tugas dibereskan</span>
                  </li>
                ) : null}
                {stats.since ? (
                  <li>
                    <strong>{monthYear(stats.since)}</strong>
                    <span>aktif sejak</span>
                  </li>
                ) : null}
              </ul>
            </div>
          </section>
        </div>
      </section>

      <main id="main-content" className="profile-page">
        <div className="profile-content">
            {isSelf ? <SelfTools person={person} owned={owned} contributing={contributing} /> : null}

            <section aria-labelledby="owned-heading">
              <h2 id="owned-heading" className="section-title">
                Sedang dikerjakan
              </h2>
              {owned.length === 0 ? (
                <p className="muted">
                  Belum ada project.{" "}
                  {isSelf ? <Link href="/new">Tunjukkan yang pertama</Link> : null}
                </p>
              ) : (
                <div className="profile-project-grid">
                  {owned.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="activity-heading">
              <h2 id="activity-heading" className="section-title">
                Jejak kerja
              </h2>
              <p className="trail-note">
                Jejak ini ditulis sistem saat kejadiannya — bukan diketik belakangan.
              </p>

              <div className="trail-modes">
                <Link className={showAll ? "" : "is-active"} href={trailPath({})}>
                  Sorotan
                </Link>
                <Link className={showAll ? "is-active" : ""} href={trailPath({ jejak: "semua" })}>
                  Semua jejak
                </Link>
              </div>

              {trail.length === 0 ? (
                <p className="muted">
                  {showAll ? "Belum ada jejak." : "Belum ada sorotan."}
                  {isSelf
                    ? " Yang kamu kerjakan di sini akan muncul sendiri — tidak perlu ditulis."
                    : ""}
                </p>
              ) : (
                <ActivityList events={trail} hidden={isSelf ? person.activityHidden : []} />
              )}

              {hasOlder ? (
                <p className="trail-more">
                  <Link
                    href={trailPath({
                      jejak: showAll ? "semua" : undefined,
                      batas: limit + TRAIL_PAGE,
                    })}
                  >
                    Muat jejak lebih lama
                  </Link>
                </p>
              ) : null}

              {isSelf ? (
                <details className="owner-tool">
                  <summary>Atur apa yang tampil</summary>
                  <form action={setActivityVisibility}>
                    <p className="hint">
                      Yang dicentang tampil di profilmu untuk orang lain. Yang tidak, cuma kamu yang
                      lihat — jejaknya tetap tersimpan, tidak terhapus.
                    </p>
                    <ul className="kind-list">
                      {EVENT_KINDS.map((kind) => (
                        <li key={kind}>
                          <label htmlFor={`show-${kind}`}>
                            <input
                              id={`show-${kind}`}
                              type="checkbox"
                              name="show"
                              value={kind}
                              defaultChecked={!person.activityHidden.includes(kind)}
                            />
                            {eventKindMeta[kind].label}
                          </label>
                        </li>
                      ))}
                    </ul>
                    <SubmitButton pendingLabel="Menyimpan…">Simpan</SubmitButton>
                  </form>
                </details>
              ) : null}
            </section>

        </div>
      </main>

      <SiteFooter />
    </>
  );
}

/**
 * What the owner of this page sees that nobody else does.
 *
 * The editor itself used to sit here, expanded from a `<summary>` — thirteen
 * inputs on the page whose whole job is to be shown to other people. It lives
 * at /akun/profil now, and this is the doorway to it, plus the one line that
 * says what is still missing before the talent pool can match on anything.
 */
function SelfTools({
  person,
  owned,
  contributing,
}: {
  person: Person;
  owned: ProjectSummary[];
  contributing: Contribution[];
}) {
  const remaining = remainingSteps(nextSteps({ person, owned, contributing }));

  return (
    <div className="profile-self-tools">
      <Link className="profile-edit-link" href="/akun/profil">
        Ubah profil
      </Link>
      {remaining.length > 0 ? (
        <p className="profile-self-note">
          Sisa {remaining.length} langkah supaya profilmu bisa ditemukan di talent pool.{" "}
          <Link href="/mulai?semua=1">Lihat langkahnya</Link>
        </p>
      ) : null}
    </div>
  );
}

function safeWebUrl(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : "";
  } catch {
    return "";
  }
}

function safePublicEmail(value: string): string {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : "";
}
