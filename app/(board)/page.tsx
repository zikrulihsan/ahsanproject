import type { Metadata } from "next";
import Link from "next/link";
import { homeMeta, shareCard } from "../content";
import { SiteFooter, SiteHeader, Arrow } from "../components/shell";
import { BoardCard } from "../components/pieces";
import { SortSelect } from "../components/sort-select";
import {
  isLane,
  familiarRoles,
  listProjects,
  openSeatsByRole,
  type Lane,
  type ProjectSummary,
} from "../lib/data";
import { ROLES, isRole, roleLabel, roleMeta } from "../lib/roles";
import { STAGES, isStage, stageMeta, type Stage } from "../lib/stages";
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
 * What the list is called once a level is picked.
 *
 * A tab with no name over the list under it reads like a filter that failed,
 * so every tab — including "Semua" — has a heading of its own.
 */
const STAGE_HEADING: Record<Stage, string> = {
  idea: "Yang masih berupa ide",
  building: "Yang sedang dibangun",
  live: "Yang sudah bisa dipakai",
  resting: "Yang sedang diistirahatkan",
};

const STAGE_EMPTY: Record<Stage, string> = {
  idea: "Belum ada ide yang ditunjukkan.",
  building: "Belum ada yang sedang dibangun.",
  live: "Belum ada yang sudah berjalan.",
  resting: "Belum ada yang sedang diistirahatkan.",
};

/** The three orders the board offers, as the dropdown reads them. */
const SORTS: { value: Lane; label: string }[] = [
  { value: "untukmu", label: "Untuk kamu" },
  { value: "terbaru", label: "Terbaru" },
  { value: "butuh-bantuan", label: "Butuh bantuan" },
];

/**
 * The lanes that were a level in disguise.
 *
 * `/?lane=dibangun` is now the "Sedang dibangun" tab, and links to it are still
 * out there — in old updates, in somebody's bookmarks — so they land on the tab
 * they meant rather than on an order the dropdown cannot show.
 */
const LEGACY_LANE_STAGE: Record<string, Stage> = { dibangun: "building", berjalan: "live" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function Feed({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const asked = one(params.lane);
  // Anything that is not a known value reads as "no filter", so a mistyped URL
  // shows the whole board rather than an empty one.
  const legacy = LEGACY_LANE_STAGE[asked];
  const sort: Lane = !legacy && isLane(asked) ? (asked as Lane) : "untukmu";
  const stage = legacy ?? (isStage(one(params.stage)) ? (one(params.stage) as Stage) : "");
  const role = isRole(one(params.role)) ? one(params.role) : "";
  const tag = one(params.tag);
  const q = one(params.q);
  // The panel opens on whichever question the visitor is already asking.
  const mode = one(params.cari) === "peran" || role ? "peran" : "proyek";

  const viewer = await currentViewer();
  // What "untuk kamu" leans on. Only asked for when it is the order being read.
  const mine = viewer && sort === "untukmu" ? await familiarRoles(viewer.id) : [];

  // Fetched without the level, so the tabs can count what each level holds
  // under the filters that are already on — and the list below is the same
  // answer with one more cut, rather than a second trip to the database.
  const scoped = await listProjects({ lane: sort, tag, role, q, familiarRoles: mine });
  const projects = stage ? scoped.filter((project) => project.stage === stage) : scoped;

  // "Cari peran" counts across everything asking for help, not across what the
  // role filter has already narrowed things to — otherwise every role but the
  // one in hand would read as zero.
  const helpBoard = mode === "peran" ? await listProjects({ lane: "butuh-bantuan", tag, q }) : [];

  const seatsByRole = await openSeatsByRole(projects.map((project) => project.id));

  const filtered = Boolean(stage || tag || role || q);
  const active = scoped.filter((project) => project.stage !== "resting").length;
  const seatsWanted = scoped.reduce((total, project) => total + project.openSeatCount, 0);
  const heading = q
    ? `Hasil untuk “${q}”`
    : stage
      ? STAGE_HEADING[stage]
      : role
        ? `Yang mencari ${roleLabel(role)}`
        : sort === "butuh-bantuan"
          ? "Yang sedang mencari orang"
          : "Semua proyek";

  return (
    <>
      <SiteHeader returnTo="/" active="jelajah" />

      <main id="main-content">
        <div className="section-tabs">
          <ul aria-label="Saring menurut tahap">
            <li>
              <Link
                className={stage ? "" : "is-active"}
                href={linkTo({ lane: sort, tag, role, q, cari: modeParam(mode) })}
              >
                Semua <small>{scoped.length}</small>
              </Link>
            </li>
            {STAGES.map((key) => {
              const count = scoped.filter((project) => project.stage === key).length;
              // A tab that leads to an empty list is a dead end; it comes back
              // as soon as a project sits at that level.
              if (count === 0 && stage !== key) return null;

              return (
                <li key={key}>
                  <Link
                    className={stage === key ? "is-active" : ""}
                    href={
                      stage === key
                        ? linkTo({ lane: sort, tag, role, q, cari: modeParam(mode) })
                        : linkTo({ lane: sort, stage: key, tag, role, q, cari: modeParam(mode) })
                    }
                    title={stageMeta[key].blurb}
                  >
                    {stageMeta[key].label} <small>{count}</small>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="board-layout">
          <section className="board-head" aria-labelledby="board-title">
            <div>
              <h1 id="board-title">Temukan proyek</h1>
              <p className="board-note">
                {active} proyek aktif · {seatsWanted} peran sedang dicari
              </p>
            </div>

            <SortSelect
              name="lane"
              value={sort}
              options={SORTS}
              label="Urutkan papan"
              hidden={{ stage, tag, role, q, cari: modeParam(mode) }}
            />
          </section>

          <section className="start-panel" aria-labelledby="start-title">
            <div className="start-head">
              <h2 id="start-title">Mau mulai dari mana?</h2>
              <div className="start-toggle">
                <Link
                  className={mode === "proyek" ? "is-active" : ""}
                  href={linkTo({ lane: sort, stage, tag, q })}
                >
                  Cari proyek
                </Link>
                <Link
                  className={mode === "peran" ? "is-active" : ""}
                  href={linkTo({ lane: sort, stage, tag, role, q, cari: "peran" })}
                >
                  Cari peran
                </Link>
              </div>
            </div>

            {mode === "peran" ? (
              <RolePicker projects={helpBoard} role={role} lane={sort} stage={stage} tag={tag} q={q} />
            ) : (
              <form className="start-search" method="get" action="/" role="search">
                {/* The board keeps whatever else is on while the search runs. */}
                {stage ? <input type="hidden" name="stage" value={stage} /> : null}
                {tag ? <input type="hidden" name="tag" value={tag} /> : null}
                {sort === "untukmu" ? null : <input type="hidden" name="lane" value={sort} />}
                <label>
                  <SearchIcon />
                  <span className="sr-only">Cari nama proyek atau topik</span>
                  <input
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder="Cari nama proyek atau topik…"
                    autoComplete="off"
                  />
                </label>
              </form>
            )}
          </section>

          {tag || q ? (
            <p className="role-bar">
              <span>
                Sedang menyaring{tag ? ` topik ${tag}` : ""}
                {q ? ` pencarian “${q}”` : ""}.
              </span>
              <Link className="filter-chip" href={linkTo({ lane: sort, stage, role })}>
                Hapus saringan ✕
              </Link>
            </p>
          ) : null}

          <section className="feed" aria-labelledby="feed-title">
            <div className="feed-header">
              <h2 id="feed-title">{heading}</h2>
              <p className="board-note">{projects.length} hasil</p>
            </div>

            {projects.length === 0 ? (
              <p className="empty">
                {filtered
                  ? stage && !tag && !q && !role
                    ? STAGE_EMPTY[stage]
                    : "Belum ada yang cocok dengan saringan ini."
                  : "Belum ada project di papan ini."}{" "}
                {filtered ? (
                  <Link href="/">Lihat semua project</Link>
                ) : (
                  <Link href="/new">Tunjukkan projectmu</Link>
                )}
                .
              </p>
            ) : (
              <ul className="board-grid">
                {projects.map((project) => (
                  <BoardCard
                    key={project.id}
                    project={project}
                    roleCounts={seatsByRole.get(project.id)}
                  />
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
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

function SearchIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

/**
 * The other half of "mau mulai dari mana?".
 *
 * Somebody who arrives knowing what they can do does not want a search box —
 * they want to see which kinds of help are actually being asked for, and how
 * many projects are asking. Roles nobody is looking for are left out rather
 * than shown at zero.
 */
function RolePicker({
  projects,
  role,
  lane,
  stage,
  tag,
  q,
}: {
  projects: ProjectSummary[];
  role: string;
  lane: Lane;
  stage: string;
  tag: string;
  q: string;
}) {
  const counts = new Map<string, number>();
  for (const project of projects) {
    for (const open of project.openRoles) counts.set(open, (counts.get(open) ?? 0) + 1);
  }
  const offered = ROLES.filter((key) => (counts.get(key) ?? 0) > 0 || role === key);

  if (offered.length === 0) {
    return (
      <p className="start-empty">
        Sedang tidak ada yang mencari bantuan.{" "}
        <Link href={linkTo({ lane, stage, tag, q })}>Lihat semua project</Link>.
      </p>
    );
  }

  return (
    <ul className="role-picker" aria-label="Peran yang sedang dicari">
      <li>
        <Link
          className={`filter-chip ${role ? "" : "is-active"}`}
          href={linkTo({ lane, stage, tag, q, cari: "peran" })}
        >
          Semua peran
        </Link>
      </li>
      {offered.map((key) => (
        <li key={key}>
          <Link
            className={`filter-chip ${role === key ? "is-active" : ""}`}
            href={
              role === key
                ? linkTo({ lane, stage, tag, q, cari: "peran" })
                : linkTo({ lane, stage, tag, role: key, q, cari: "peran" })
            }
            title={roleMeta[key].blurb}
          >
            {roleMeta[key].label} <small>{counts.get(key) ?? 0}</small>
            {role === key ? " ✕" : ""}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** "peran" only travels in the URL when it is not what the panel opens on. */
function modeParam(mode: string): string {
  return mode === "peran" ? "peran" : "";
}

function linkTo(query: {
  lane?: string;
  stage?: string;
  tag?: string;
  role?: string;
  q?: string;
  cari?: string;
}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && !(key === "lane" && value === "untukmu")) params.set(key, value);
  }
  const search = params.toString();
  return search ? `/?${search}` : "/";
}
