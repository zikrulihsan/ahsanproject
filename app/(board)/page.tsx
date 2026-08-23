import type { Metadata } from "next";
import Link from "next/link";
import { homeMeta, shareCard } from "../content";
import { SiteFooter, SiteHeader, Arrow } from "../components/shell";
import { ProjectRow } from "../components/pieces";
import { listProjects, listTags, type FeedQuery, type ProjectSummary } from "../lib/data";
import { ROLES, isRole, roleLabel, roleMeta } from "../lib/roles";
import { STAGES, isStage, stageMeta } from "../lib/stages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: homeMeta.title,
  description: homeMeta.description,
  alternates: { canonical: "/" },
  openGraph: shareCard({
    title: homeMeta.title,
    description: homeMeta.description,
    url: "/",
  }),
};

const SORTS: { key: NonNullable<FeedQuery["sort"]>; label: string; lead: string }[] = [
  { key: "terbaru", label: "Terbaru", lead: "Paling baru masuk" },
  { key: "didukung", label: "Paling didukung", lead: "Paling banyak didukung" },
  { key: "dibutuhkan", label: "Paling butuh orang", lead: "Paling butuh orang" },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function Feed({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const stage = one(params.stage);
  const tag = one(params.tag);
  // Anything that is not a known role reads as "no filter", so a mistyped URL
  // shows the whole board rather than an empty one.
  const role = isRole(one(params.role)) ? one(params.role) : "";
  const q = one(params.q);
  const sortOption = SORTS.find((option) => option.key === one(params.sort)) ?? SORTS[0];
  const sort = sortOption.key;

  const [projects, tags] = await Promise.all([
    listProjects({ stage, tag, role, q, sort }),
    listTags(),
  ]);

  const openSeats = projects.reduce((total, project) => total + project.openSeatCount, 0);
  const filtered = Boolean(stage || tag || role || q);

  return (
    <>
      <SiteHeader returnTo="/" active="jelajah" />

      <main id="main-content">
        {/* The level rail is the board's main cut, so it behaves like a set of
            application tabs and stays put while the list scrolls under it. */}
        <div className="section-tabs">
          <ul aria-label="Saring menurut level proyek">
            <li>
              <Link className={stage ? "" : "is-active"} href={linkTo({ tag, role, q, sort })}>
                Semua
              </Link>
            </li>
            {STAGES.map((key) => (
              <li key={key}>
                <Link
                  className={stage === key ? "is-active" : ""}
                  href={linkTo({ stage: key, tag, role, q, sort })}
                  title={stageMeta[key].blurb}
                >
                  {stageMeta[key].label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="app-layout">
          <section className="feed" aria-labelledby="feed-title">
            <div className="feed-header">
              <div>
                <h1 id="feed-title">
                  {q ? `Hasil untuk “${q}”` : isStage(stage) ? stageMeta[stage].label : "Proyek di papan"}
                </h1>
                <p className="board-note">
                  {projects.length} proyek
                  {openSeats > 0 ? ` · ${openSeats} peran menunggu diisi` : ""}
                  {tags.length > 0 ? ` · ${tags.length} topik` : ""}
                </p>
              </div>
              <div className="sort-bar">
                <span>Urutkan</span>
                <ul>
                  {SORTS.map((option) => (
                    <li key={option.key}>
                      <Link
                        className={sort === option.key ? "is-active" : ""}
                        href={linkTo({ stage, tag, role, q, sort: option.key })}
                      >
                        {option.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Contribution-first: the role you can fill is the first cut the
                board offers, before topic or popularity. */}
            <ul className="filter-row" aria-label="Saring menurut peran yang dibutuhkan">
              <li>
                <Link className={`filter-chip ${role ? "" : "is-active"}`} href={linkTo({ stage, tag, q, sort })}>
                  Semua peran
                </Link>
              </li>
              {ROLES.map((key) => (
                <li key={key}>
                  <Link
                    className={`filter-chip ${role === key ? "is-active" : ""}`}
                    href={
                      role === key
                        ? linkTo({ stage, tag, q, sort })
                        : linkTo({ stage, tag, role: key, q, sort })
                    }
                    title={roleMeta[key].blurb}
                  >
                    {roleMeta[key].label}
                    {role === key ? " ✕" : ""}
                  </Link>
                </li>
              ))}
            </ul>

            {tag || q ? (
              <p className="role-bar">
                <span>
                  Sedang menyaring{tag ? ` topik #${tag}` : ""}
                  {q ? ` pencarian “${q}”` : ""}.
                </span>
                <Link className="filter-chip" href={linkTo({ stage, role, sort })}>
                  Hapus saringan ✕
                </Link>
              </p>
            ) : null}

            {projects.length === 0 ? (
              <p className="empty">
                Belum ada yang cocok dengan saringan ini.{" "}
                {filtered ? <Link href="/">Lihat semua proyek</Link> : <Link href="/new">Taruh ide pertamanya</Link>}.
              </p>
            ) : (
              <ul className="project-list">
                {projects.map((project, index) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    rank={index + 1}
                    ribbon={index === 0 && projects.length > 1 ? sortOption.lead : undefined}
                  />
                ))}
              </ul>
            )}

            <p className="feed-outro">
              Punya masalah yang belum ada di papan ini?{" "}
              <Link href="/new">
                Taruh idemu <Arrow />
              </Link>
            </p>
          </section>

          <aside className="sidebar" aria-label="Cara ikut menggarap">
            <OpenRoles projects={projects} />

            {tags.length > 0 ? (
              <section className="side-card" aria-labelledby="topic-title">
                <p className="section-label">Sedang dibahas</p>
                <h2 id="topic-title" className="sr-only">
                  Topik
                </h2>
                <ul className="topic-cloud">
                  {tag ? (
                    <li>
                      <Link className="is-active" href={linkTo({ stage, role, q, sort })}>
                        #{tag} <b>✕</b>
                      </Link>
                    </li>
                  ) : null}
                  {tags
                    .filter((entry) => entry.tag !== tag)
                    .slice(0, 12)
                    .map((entry) => (
                      <li key={entry.tag}>
                        <Link href={linkTo({ stage, tag: entry.tag, role, q, sort })}>
                          #{entry.tag} <b>{entry.count}</b>
                        </Link>
                      </li>
                    ))}
                </ul>
              </section>
            ) : null}
          </aside>
        </div>

      </main>

      <SiteFooter />
    </>
  );
}

/**
 * Small, scoped entry points: one open role, one project, one click. Drawn from
 * the board already fetched, so it costs no extra query.
 */
function OpenRoles({ projects }: { projects: ProjectSummary[] }) {
  const openings = projects
    .flatMap((project) => project.openRoles.map((role) => ({ project, role })))
    .slice(0, 5);

  return (
    <section className="side-card role-card" aria-labelledby="roles-title">
      <div className="side-heading">
        <div>
          <p className="section-label">Kontribusi</p>
          <h2 id="roles-title">Mulai dari sini</h2>
        </div>
      </div>
      <p className="side-intro">
        Peran yang sedang dibuka, lengkap dengan konteks proyeknya — cocok untuk kontribusi pertamamu.
      </p>

      {openings.length === 0 ? (
        <p className="side-intro">
          Belum ada peran terbuka di saringan ini. <Link href="/">Lihat semua proyek</Link>.
        </p>
      ) : (
        <ul className="role-list">
          {openings.map(({ project, role }, index) => (
            <li key={`${project.id}-${role}-${index}`}>
              <Link className="role-row" href={`/projects/${project.slug}`}>
                <span className={`role-symbol level-${project.stage}`} aria-hidden="true">
                  {roleLabel(role).slice(0, 2).toUpperCase()}
                </span>
                <span>
                  <strong>Butuh {roleLabel(role)}</strong>
                  <small>{project.title}</small>
                  <em>{stageMeta[project.stage].label}</em>
                </span>
                <span className="arrow arrow-diagonal" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function linkTo(query: {
  stage?: string;
  tag?: string;
  role?: string;
  q?: string;
  sort?: string;
}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && !(key === "sort" && value === "terbaru")) params.set(key, value);
  }
  const search = params.toString();
  return search ? `/?${search}` : "/";
}
