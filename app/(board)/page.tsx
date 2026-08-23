import type { Metadata } from "next";
import Link from "next/link";
import { homeMeta, shareCard } from "../content";
import { SiteFooter, SiteHeader, Arrow } from "../components/shell";
import { ProjectRow, initials } from "../components/pieces";
import {
  LANES,
  isLane,
  familiarRoles,
  listProjects,
  listTags,
  type Lane,
  type ProjectSummary,
} from "../lib/data";
import { ROLES, isRole, roleLabel, roleMeta } from "../lib/roles";
import { STAGES, isStage, stageMeta } from "../lib/stages";
import { currentViewer } from "../lib/session";

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

/**
 * The board's lanes.
 *
 * Each one is a question somebody actually arrives with. `heading` is what the
 * list is called once they pick it — a lane with no name over it reads like a
 * filter that failed.
 */
const LANE_META: Record<Lane, { label: string; heading: string; empty: string }> = {
  untukmu: {
    label: "Untuk kamu",
    heading: "Yang mungkin cocok buat kamu",
    empty: "Belum ada yang bisa ditawarkan di sini.",
  },
  terbaru: {
    label: "Terbaru",
    heading: "Baru ditunjukkan",
    empty: "Belum ada project baru.",
  },
  "butuh-bantuan": {
    label: "Butuh bantuan",
    heading: "Sedang mencari orang",
    empty: "Sedang tidak ada yang mencari bantuan.",
  },
  dibangun: {
    label: "Sedang dibangun",
    heading: "Yang sedang dibangun",
    empty: "Belum ada yang sedang dibangun.",
  },
  berjalan: {
    label: "Sudah berjalan",
    heading: "Sudah bisa dipakai",
    empty: "Belum ada yang sudah berjalan.",
  },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function Feed({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const lane: Lane = isLane(one(params.lane)) ? (one(params.lane) as Lane) : "untukmu";
  // Anything that is not a known value reads as "no filter", so a mistyped URL
  // shows the whole board rather than an empty one.
  const stage = isStage(one(params.stage)) ? one(params.stage) : "";
  const role = isRole(one(params.role)) ? one(params.role) : "";
  const tag = one(params.tag);
  const q = one(params.q);

  const viewer = await currentViewer();
  // What "untuk kamu" leans on. Only asked for when it is the lane being read.
  const mine = viewer && lane === "untukmu" ? await familiarRoles(viewer.id) : [];

  const [projects, tags, helpWanted] = await Promise.all([
    listProjects({ lane, stage, tag, role, q, familiarRoles: mine }),
    listTags(),
    // The sidebar asks its own question, so it asks the database its own way
    // rather than filtering whatever the current lane happened to return.
    listProjects({ lane: "butuh-bantuan" }),
  ]);

  const meta = LANE_META[lane];
  const filtered = Boolean(stage || tag || role || q);
  // The lanes that already fix a level do not also offer level chips.
  const showStageChips = lane === "untukmu" || lane === "terbaru" || lane === "butuh-bantuan";

  return (
    <>
      <SiteHeader returnTo="/" active="jelajah" />

      <main id="main-content">
        {q ? null : (
          <section className="board-intro" aria-labelledby="intro-title">
            <h1 id="intro-title">Temukan sesuatu yang layak dibantu.</h1>
            <p>
              Lihat apa yang sedang dibangun orang lain, ikuti perjalanannya, atau ikut
              mengerjakannya.
            </p>
            <div className="intro-actions">
              <Link className="button-solid" href="/?lane=dibangun">
                Jelajahi project
              </Link>
              <Link className="button-quiet" href="/?lane=butuh-bantuan">
                Butuh bantuan <Arrow />
              </Link>
            </div>
            <BoardPulse needing={helpWanted.length} />
          </section>
        )}

        <div className="section-tabs">
          <ul aria-label="Cara menjelajah papan">
            {LANES.map((key) => (
              <li key={key}>
                <Link
                  className={lane === key ? "is-active" : ""}
                  href={linkTo({ lane: key, tag, q })}
                >
                  {LANE_META[key].label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="app-layout">
          <section className="feed" aria-labelledby="feed-title">
            <div className="feed-header">
              <h2 id="feed-title">{q ? `Hasil untuk “${q}”` : meta.heading}</h2>
              <p className="board-note">{projects.length} project</p>
            </div>

            <div className="filter-strip">
              {showStageChips ? (
                <ul className="filter-row" aria-label="Saring menurut tahap">
                  <li>
                    <Link
                      className={`filter-chip ${stage ? "" : "is-active"}`}
                      href={linkTo({ lane, tag, role, q })}
                    >
                      Semua tahap
                    </Link>
                  </li>
                  {STAGES.map((key) => (
                    <li key={key}>
                      <Link
                        className={`filter-chip ${stage === key ? "is-active" : ""}`}
                        href={
                          stage === key
                            ? linkTo({ lane, tag, role, q })
                            : linkTo({ lane, stage: key, tag, role, q })
                        }
                        title={stageMeta[key].blurb}
                      >
                        {stageMeta[key].label}
                        {stage === key ? " ✕" : ""}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}

              {/* Role chips belong to the one lane that is about roles. On the
                  rest of the board they were six buttons answering a question
                  nobody had asked yet. */}
              {lane === "butuh-bantuan" ? (
                <ul className="filter-row" aria-label="Saring menurut bantuan yang dicari">
                  <li>
                    <Link
                      className={`filter-chip ${role ? "" : "is-active"}`}
                      href={linkTo({ lane, stage, tag, q })}
                    >
                      Semua bantuan
                    </Link>
                  </li>
                  {ROLES.map((key) => (
                    <li key={key}>
                      <Link
                        className={`filter-chip ${role === key ? "is-active" : ""}`}
                        href={
                          role === key
                            ? linkTo({ lane, stage, tag, q })
                            : linkTo({ lane, stage, tag, role: key, q })
                        }
                        title={roleMeta[key].blurb}
                      >
                        {roleMeta[key].label}
                        {role === key ? " ✕" : ""}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}

              {tag || q ? (
                <p className="role-bar">
                  <span>
                    Sedang menyaring{tag ? ` topik #${tag}` : ""}
                    {q ? ` pencarian “${q}”` : ""}.
                  </span>
                  <Link className="filter-chip" href={linkTo({ lane, stage, role })}>
                    Hapus saringan ✕
                  </Link>
                </p>
              ) : null}
            </div>

            {projects.length === 0 ? (
              <p className="empty">
                {filtered ? "Belum ada yang cocok dengan saringan ini." : meta.empty}{" "}
                {filtered ? (
                  <Link href="/">Lihat semua project</Link>
                ) : (
                  <Link href="/new">Tunjukkan projectmu</Link>
                )}
                .
              </p>
            ) : (
              <ul className="project-list">
                {projects.map((project) => (
                  <ProjectRow key={project.id} project={project} />
                ))}
              </ul>
            )}

            <p className="feed-outro">
              Sedang membangun sesuatu?{" "}
              <Link href="/new">
                Tunjukkan di sini <Arrow />
              </Link>
            </p>
          </section>

          <aside className="sidebar" aria-label="Cara ikut membantu">
            <HelpWanted projects={helpWanted} />

            {tags.length > 0 ? (
              <section className="side-card" aria-labelledby="topic-title">
                <p className="section-label">Sedang dibahas</p>
                <h2 id="topic-title" className="sr-only">
                  Topik
                </h2>
                <ul className="topic-cloud">
                  {tag ? (
                    <li>
                      <Link className="is-active" href={linkTo({ lane, stage, role, q })}>
                        #{tag} <b>✕</b>
                      </Link>
                    </li>
                  ) : null}
                  {tags
                    .filter((entry) => entry.tag !== tag)
                    .slice(0, 12)
                    .map((entry) => (
                      <li key={entry.tag}>
                        <Link href={linkTo({ lane, stage, tag: entry.tag, role, q })}>
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
 * Two numbers under the opening line, and no more.
 *
 * Enough to show the board is not empty; not so much that arriving feels like
 * opening a dashboard. They count the same two lanes the buttons above lead to,
 * so the numbers and the buttons can never disagree — and the "butuh bantuan"
 * half is handed down from the sidebar's fetch rather than asked for twice.
 */
async function BoardPulse({ needing }: { needing: number }) {
  const building = await listProjects({ lane: "dibangun" });

  if (building.length === 0 && needing === 0) return null;

  return (
    <p className="board-pulse">
      {building.length > 0 ? `${building.length} project sedang dibangun` : null}
      {building.length > 0 && needing > 0 ? " · " : null}
      {needing > 0 ? `${needing} sedang mencari bantuan` : null}
    </p>
  );
}

/**
 * The sidebar's one job: a concrete way in.
 *
 * One opening, with the project it belongs to and what the help actually is —
 * not a column of role names, which reads like a vacancy board and tells
 * nobody what they would be doing. Four at most; the rest are one link away.
 */
function HelpWanted({ projects }: { projects: ProjectSummary[] }) {
  const openings = projects
    .flatMap((project) => project.openRoles.slice(0, 1).map((role) => ({ project, role })))
    .slice(0, 4);

  return (
    <section className="side-card role-card" aria-labelledby="roles-title">
      <div className="side-heading">
        <div>
          <p className="section-label">Kontribusi</p>
          <h2 id="roles-title">Lagi butuh tangan</h2>
        </div>
      </div>

      {openings.length === 0 ? (
        <p className="side-intro">
          Sedang tidak ada yang mencari bantuan. <Link href="/">Lihat semua project</Link>.
        </p>
      ) : (
        <>
          <ul className="role-list">
            {openings.map(({ project, role }) => (
              <li key={`${project.id}-${role}`}>
                <Link className="role-row" href={`/projects/${project.slug}`}>
                  <span className="role-symbol" aria-hidden="true">
                    {initials(project.title)}
                  </span>
                  <span>
                    <strong>{project.title}</strong>
                    <em>Bantu sebagai {roleLabel(role)}</em>
                    <small>{project.nowText || project.tagline}</small>
                  </span>
                  <span className="arrow arrow-diagonal" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="side-more">
            <Link href="/?lane=butuh-bantuan">
              Lihat semua kesempatan <Arrow />
            </Link>
          </p>
        </>
      )}
    </section>
  );
}

function linkTo(query: {
  lane?: string;
  stage?: string;
  tag?: string;
  role?: string;
  q?: string;
}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && !(key === "lane" && value === "untukmu")) params.set(key, value);
  }
  const search = params.toString();
  return search ? `/?${search}` : "/";
}
