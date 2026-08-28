import type { Metadata } from "next";
import Link from "next/link";
import { BoardCard, initials } from "../components/pieces";
import { ExploreSearchForm } from "../components/explore-search-form";
import { SearchableFilter } from "../components/searchable-filter";
import { Arrow, SiteFooter, SiteHeader } from "../components/shell";
import { SortSelect } from "../components/sort-select";
import { shareCard } from "../content";
import {
  familiarRoles,
  isLane,
  listPeople,
  listOpenRoleSuggestions,
  listProjects,
  openSeatsByRole,
  tagCountsFromProjects,
  type FeedQuery,
  type Lane,
  type ProjectSummary,
} from "../lib/data";
import { readPublicly } from "../lib/public-read";
import { normaliseRole, roleLabel, type Role } from "../lib/roles";
import { isStage, stageMeta, STAGES, type Stage } from "../lib/stages";
import { currentViewer } from "../lib/session";

export const dynamic = "force-dynamic";

const title = "Explore — Ahsan Project";
const description = "Explore project berdasarkan kategori, level, dan role, lalu temukan tempat terbaik untuk ikut berkontribusi.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/kolaborasi" },
  openGraph: shareCard({ title, description, url: "/kolaborasi" }),
};

const SORTS: { value: Lane; label: string }[] = [
  { value: "untukmu", label: "Pilihan untukmu" },
  { value: "terbaru", label: "Project terbaru" },
  { value: "aktif", label: "Paling aktif" },
];

const SORT_VALUES = new Set<Lane>(SORTS.map((option) => option.value));
const LEGACY_LANE_STAGE: Record<string, Stage> = { dibangun: "building", berjalan: "live" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function CollaborationPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const askedLane = one(params.lane);
  const legacyStage = LEGACY_LANE_STAGE[askedLane];
  const sort: Lane = isLane(askedLane) && SORT_VALUES.has(askedLane) ? askedLane : "untukmu";
  const stage = legacyStage ?? (isStage(one(params.stage)) ? (one(params.stage) as Stage) : "");
  const role = normaliseRole(one(params.role)) ?? "";
  const tag = one(params.tag);
  const q = one(params.q);
  const searchBy = one(params.searchBy) === "role" ? "role" : "project";
  const needs = one(params.needs) === "open" || askedLane === "butuh-bantuan" ? "open" : "";

  const viewer = await currentViewer();
  const familiarResult = viewer && sort === "untukmu"
    ? await readPublicly<string[]>(
        "role familiar untuk rekomendasi",
        () => familiarRoles(viewer.id),
        [],
      )
    : { value: [] as string[], unavailable: false };
  const familiar = familiarResult.value;
  const query: FeedQuery = {
    lane: sort,
    stage,
    tag,
    role,
    q: searchBy === "project" ? q : "",
    roleQuery: searchBy === "role" ? q : "",
    needsHelp: needs === "open",
    familiarRoles: familiar,
  };

  const projectsPromise = readPublicly<ProjectSummary[]>(
    "project Explore",
    () => listProjects(query),
    [],
  );
  const topicProjectsPromise = tag
    ? readPublicly<ProjectSummary[]>(
        "kategori Explore",
        () => listProjects({ ...query, tag: "" }),
        [],
      )
    : projectsPromise;
  const [projectsResult, topicProjectsResult, helpBoardResult, peopleResult, roleSuggestionsResult] =
    await Promise.all([
      projectsPromise,
      topicProjectsPromise,
      readPublicly<ProjectSummary[]>(
        "project yang membutuhkan bantuan",
        () => listProjects({ lane: "butuh-bantuan" }),
        [],
      ),
      readPublicly("orang di Explore", () => listPeople(400), []),
      readPublicly("saran role terbuka", () => listOpenRoleSuggestions(), []),
    ]);
  const projects = projectsResult.value;
  const topics = tagCountsFromProjects(topicProjectsResult.value);
  const helpBoard = helpBoardResult.value;
  const people = peopleResult.value;
  const roleSuggestions = roleSuggestionsResult.value;
  const seatsResult = await readPublicly<Map<number, Record<string, number>>>(
    "jumlah role terbuka",
    () => openSeatsByRole(projects.map((project) => project.id)),
    new Map(),
  );
  const seatsByRole = seatsResult.value;
  const dataUnavailable = [
    familiarResult,
    projectsResult,
    topicProjectsResult,
    helpBoardResult,
    peopleResult,
    roleSuggestionsResult,
    seatsResult,
  ].some((result) => result.unavailable);
  const rankedRoles = rankRoles(helpBoard).slice(0, 5);
  const filtered = Boolean(stage || tag || role || q || needs);
  const activeControlCount = [stage, tag, role, needs, sort === "untukmu" ? "" : sort].filter(Boolean).length;
  const currentPath = linkTo({ lane: sort, stage, tag, role, q, searchBy, needs });

  return (
    <>
      <SiteHeader returnTo={currentPath} active="kolaborasi" />

      <main id="main-content" className="discovery-page collaboration-page">
        <section className="collaboration-hero" aria-labelledby="collaboration-title">
          <div>
            <p className="home-eyebrow">temukan tempat untuk ikut bertumbuh</p>
            <h1 id="collaboration-title">Explore</h1>
            <p>Telusuri project berdasarkan kebutuhanmu, lalu pilih kontribusi yang paling cocok.</p>
          </div>
          <div className="contributor-pulse" aria-label={`${people.length} kontributor`}>
            <div className="pulse-avatars" aria-hidden="true">
              {people.slice(0, 3).map((person) => (
                <span key={person.id}>{initials(person.name)}</span>
              ))}
              <span className="pulse-plus">+</span>
            </div>
            <p>
              <strong>{people.length} kontributor</strong>
              <small>siap membangun bersama</small>
            </p>
          </div>
        </section>

        {dataUnavailable ? (
          <p className="public-data-notice" role="status">
            Sebagian data belum berhasil dimuat. <Link href={currentPath}>Coba lagi</Link>.
          </p>
        ) : null}

        <section className="collaboration-panel" aria-label="Cari project atau role, lalu filter dan urutkan hasil">
          <ExploreSearchForm
            mode={searchBy}
            q={q}
            suggestions={roleSuggestions}
            hidden={{
              stage,
              tag,
              role,
              needs,
              lane: sort === "untukmu" ? "" : sort,
            }}
          />

          <details className="collaboration-filter-panel">
            <summary className="collaboration-filter-summary">
              <span><FilterIcon /> Filter &amp; urutkan</span>
              <span>
                {activeControlCount > 0 ? `${activeControlCount} aktif` : "Opsional"}
                <i aria-hidden="true" />
              </span>
            </summary>

            <div className="collaboration-filter-controls">
              <div className="collaboration-control collaboration-sort-control">
                <span>Urutkan</span>
                <SortSelect
                  action="/kolaborasi"
                  name="lane"
                  value={sort}
                  label="Urutkan project"
                  options={SORTS}
                  hidden={{ stage, tag, role, q, searchBy: searchBy === "role" ? searchBy : "", needs }}
                />
              </div>

              <div className="collaboration-control">
                <span>Kategori</span>
                <SearchableFilter
                  action="/kolaborasi"
                  name="tag"
                  value={tag}
                  label="Filter kategori"
                  placeholder="Ketik kategori…"
                  options={withSelectedTopic(topics, tag).map((topic) => ({
                    value: topic.tag,
                    label: topic.tag,
                    meta: `${topic.count} project`,
                  }))}
                  hidden={{ stage, role, q, searchBy: searchBy === "role" ? searchBy : "", needs, lane: sort === "untukmu" ? "" : sort }}
                />
              </div>

              <div className="collaboration-control">
                <span>Level project</span>
                <SortSelect
                  action="/kolaborasi"
                  name="stage"
                  value={stage}
                  label="Filter level project"
                  options={[
                    { value: "", label: "Semua level" },
                    ...STAGES.map((entry) => ({ value: entry, label: stageMeta[entry].label })),
                  ]}
                  hidden={{ tag, role, q, searchBy: searchBy === "role" ? searchBy : "", needs, lane: sort === "untukmu" ? "" : sort }}
                />
              </div>

              <div className="collaboration-control">
                <span>Kebutuhan</span>
                <SortSelect
                  action="/kolaborasi"
                  name="needs"
                  value={needs}
                  label="Filter kebutuhan kolaborator"
                  options={[
                    { value: "", label: "Semua project" },
                    { value: "open", label: "Mencari kolaborator" },
                  ]}
                  hidden={{ stage, tag, role, q, searchBy: searchBy === "role" ? searchBy : "", lane: sort === "untukmu" ? "" : sort }}
                />
              </div>
            </div>
          </details>
        </section>

        {filtered ? (
          <div className="active-filters home-active-filters" aria-label="Saringan aktif">
            <ul>
              {role ? (
                <li>
                  <Link href={linkTo({ lane: sort, stage, tag, q, searchBy, needs })}>
                    Role: <strong>{roleLabel(role)}</strong> <span>×</span>
                  </Link>
                </li>
              ) : null}
              {tag ? <li><Link href={linkTo({ lane: sort, stage, role, q, searchBy, needs })}>Kategori: <strong>{tag}</strong> <span>×</span></Link></li> : null}
              {stage ? <li><Link href={linkTo({ lane: sort, tag, role, q, searchBy, needs })}>Level: <strong>{stageMeta[stage].label}</strong> <span>×</span></Link></li> : null}
              {needs ? <li><Link href={linkTo({ lane: sort, stage, tag, role, q, searchBy })}>Kebutuhan: <strong>Mencari kolaborator</strong> <span>×</span></Link></li> : null}
              {q ? <li><Link href={linkTo({ lane: sort, stage, tag, role, searchBy, needs })}>{searchBy === "role" ? "Role dicari" : "Pencarian"}: <strong>“{q}”</strong> <span>×</span></Link></li> : null}
            </ul>
            <Link className="clear-filters" href={linkTo({ lane: sort })}>Hapus semua</Link>
          </div>
        ) : null}

        <div className="discovery-content collaboration-content">
          <section className="home-projects" aria-labelledby="collaboration-project-list-title">
            <div className="home-list-head collaboration-list-head">
              <div>
                <h2 id="collaboration-project-list-title">Project untuk kolaborasi</h2>
                <p>{projects.length} project ditemukan</p>
              </div>
            </div>

            <div className="feed" aria-label="Daftar proyek">
              {projects.length === 0 ? (
                <div className="empty home-empty">
                  <p>Belum ada project yang cocok dengan pencarian ini.</p>
                  <Link href="/kolaborasi">Lihat semua project</Link>
                </div>
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
            </div>
          </section>

          <aside className="discovery-sidebar" aria-label="Pintasan kolaborasi">
            <section className="show-project-card">
              <span className="show-project-plus" aria-hidden="true">+</span>
              <h2>Punya sesuatu yang sedang dibangun?</h2>
              <p>Tunjukkan project-mu dan temukan orang yang bisa membawanya lebih jauh.</p>
              <Link href="/new">Tambah project</Link>
              <small>Gratis untuk komunitas</small>
            </section>

            <section className="role-ranking">
              <div className="role-ranking-head">
                <div>
                  <p className="home-eyebrow">Mulai dari peranmu</p>
                  <h2>Role yang paling dicari</h2>
                  <p>Pilih role, lalu lihat project yang sedang menunggu kontribusimu.</p>
                </div>
                <span className="live-dot" title="Diperbarui dari posisi yang sedang terbuka" />
              </div>
              {rankedRoles.length > 0 ? (
                <ol>
                  {rankedRoles.map((entry, index) => (
                    <li key={entry.role}>
                      <Link href={linkTo({ lane: sort, stage, tag, q: roleLabel(entry.role), searchBy: "role", needs: "open" })}>
                        <span className="role-number">{String(index + 1).padStart(2, "0")}</span>
                        <span>
                          <strong>{roleLabel(entry.role)}</strong>
                          <small>{entry.count} project</small>
                        </span>
                        <Arrow />
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="role-ranking-empty">Belum ada role yang sedang dibuka.</p>
              )}
              <Link className="all-roles-link" href="/kolaborasi?searchBy=role&needs=open">
                Lihat semua role <Arrow />
              </Link>
            </section>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

function rankRoles(projects: ProjectSummary[]): { role: Role; count: number }[] {
  const counts = new Map<Role, number>();
  for (const project of projects) {
    const roles = new Set(project.openRoles.map(normaliseRole).filter((entry): entry is Role => Boolean(entry)));
    for (const role of roles) counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count || roleLabel(a.role).localeCompare(roleLabel(b.role), "id"));
}

function withSelectedTopic(topics: { tag: string; count: number }[], selected: string) {
  return selected && !topics.some((topic) => topic.tag === selected)
    ? [{ tag: selected, count: 0 }, ...topics]
    : topics;
}

function FilterIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M7 12h10M10 17h4" />
    </svg>
  );
}

function linkTo(query: {
  lane?: string;
  stage?: string;
  tag?: string;
  role?: string;
  q?: string;
  searchBy?: string;
  needs?: string;
}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const isDefault = (key === "lane" && value === "untukmu") ||
      (key === "searchBy" && value === "project");
    if (value && !isDefault) params.set(key, value);
  }
  const search = params.toString();
  return search ? `/kolaborasi?${search}` : "/kolaborasi";
}
