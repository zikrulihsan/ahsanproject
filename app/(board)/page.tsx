import type { Metadata } from "next";
import Link from "next/link";
import { homeMeta, shareCard } from "../content";
import { BoardRail } from "../components/board-rail";
import { BoardCard } from "../components/pieces";
import { SortSelect } from "../components/sort-select";
import { Arrow, SiteFooter, SiteHeader } from "../components/shell";
import {
  familiarRoles,
  isLane,
  listProjects,
  openSeatsByRole,
  tagCounts,
  type Lane,
} from "../lib/data";
import { isRole, roleLabel } from "../lib/roles";
import { isStage, stageMeta, type Stage } from "../lib/stages";
import { currentViewer } from "../lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: homeMeta.title,
  description: homeMeta.description,
  alternates: { canonical: "/" },
  openGraph: shareCard({ title: homeMeta.title, description: homeMeta.description, url: "/" }),
};

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

const SORTS: { value: Lane; label: string }[] = [
  { value: "untukmu", label: "Untuk kamu" },
  { value: "terbaru", label: "Terbaru" },
  { value: "butuh-bantuan", label: "Butuh bantuan" },
];

const LEGACY_LANE_STAGE: Record<string, Stage> = { dibangun: "building", berjalan: "live" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function Feed({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const asked = one(params.lane);
  const legacy = LEGACY_LANE_STAGE[asked];
  const sort: Lane = !legacy && isLane(asked) ? (asked as Lane) : "untukmu";
  const stage = legacy ?? (isStage(one(params.stage)) ? (one(params.stage) as Stage) : "");
  const role = isRole(one(params.role)) ? one(params.role) : "";
  const tag = one(params.tag);
  const q = one(params.q);

  const viewer = await currentViewer();
  const mine = viewer && sort === "untukmu" ? await familiarRoles(viewer.id) : [];

  // Each rail section omits its own active cut so every alternative stays one
  // click away. Stage counts share the already-fetched scoped collection.
  const [scoped, topics, helpBoard] = await Promise.all([
    listProjects({ lane: sort, tag, role, q, familiarRoles: mine }),
    tagCounts({ lane: sort, stage, role, q, familiarRoles: mine }),
    listProjects({ lane: "butuh-bantuan", tag, q }),
  ]);
  const projects = stage ? scoped.filter((project) => project.stage === stage) : scoped;
  const seatsByRole = await openSeatsByRole(projects.map((project) => project.id));

  const filtered = Boolean(stage || tag || role || q);
  const active = scoped.filter((project) => project.stage !== "resting").length;
  const seatsWanted = scoped.reduce((total, project) => total + project.openSeatCount, 0);

  return (
    <>
      <SiteHeader returnTo="/" active="jelajah" />

      <main id="main-content">
        <div className="explore-layout">
          <BoardRail
            topics={topics}
            scoped={scoped}
            helpBoard={helpBoard}
            lane={sort}
            stage={stage}
            tag={tag}
            role={role}
            q={q}
            linkTo={linkTo}
          />

          <div className="explore-main">
            <form className="explore-search" method="get" action="/" role="search">
              {stage ? <input type="hidden" name="stage" value={stage} /> : null}
              {tag ? <input type="hidden" name="tag" value={tag} /> : null}
              {role ? <input type="hidden" name="role" value={role} /> : null}
              {sort === "untukmu" ? null : <input type="hidden" name="lane" value={sort} />}
              <label>
                <SearchIcon />
                <span className="sr-only">Cari nama proyek atau topik</span>
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder={tag ? `Cari di ${tag}…` : "Cari nama proyek atau topik…"}
                  autoComplete="off"
                />
              </label>
            </form>

            <section className="board-head" aria-labelledby="board-title">
              <div>
                <h1 id="board-title">{tag || "Temukan proyek"}</h1>
                <p className="board-note" aria-live="polite">
                  {active} project · {seatsWanted} butuh tangan
                </p>
              </div>
              <SortSelect
                name="lane"
                value={sort}
                options={SORTS}
                label="Urutkan papan"
                hidden={{ stage, tag, role, q }}
              />
            </section>

            {filtered ? (
              <div className="active-filters" aria-label="Saringan aktif">
                <ul>
                  {tag ? <li><Link href={linkTo({ lane: sort, stage, role, q })}>bidang: {tag} ✕</Link></li> : null}
                  {stage ? (
                    <li><Link title={STAGE_HEADING[stage]} href={linkTo({ lane: sort, tag, role, q })}>tahap: {stageMeta[stage].label} ✕</Link></li>
                  ) : null}
                  {role ? (
                    <li><Link href={linkTo({ lane: sort, stage, tag, q })}>peran: {roleLabel(role)} ✕</Link></li>
                  ) : null}
                  {q ? (
                    <li><Link href={linkTo({ lane: sort, stage, tag, role })}>pencarian: “{q}” ✕</Link></li>
                  ) : null}
                </ul>
                <Link className="clear-filters" href={linkTo({ lane: sort })}>Hapus semua saringan</Link>
              </div>
            ) : null}

            <section className="feed" aria-label="Daftar proyek">
              {projects.length === 0 ? (
                <p className="empty">
                  {filtered
                    ? stage && !tag && !q && !role
                      ? STAGE_EMPTY[stage]
                      : "Belum ada yang cocok dengan saringan ini."
                    : "Belum ada project di papan ini."}{" "}
                  {filtered ? <Link href="/">Lihat semua project</Link> : <Link href="/new">Tunjukkan projectmu</Link>}.
                </p>
              ) : (
                <ul className="board-grid">
                  {projects.map((project) => (
                    <BoardCard key={project.id} project={project} roleCounts={seatsByRole.get(project.id)} />
                  ))}
                </ul>
              )}

              <p className="feed-outro">
                Sedang membangun sesuatu?{" "}
                <Link href="/new">Tunjukkan di sini <Arrow /></Link>
              </p>
            </section>
          </div>
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
