import type { Metadata } from "next";
import Link from "next/link";
import { BoardCard, initials } from "../components/pieces";
import { Arrow, SiteFooter, SiteHeader } from "../components/shell";
import { SortSelect } from "../components/sort-select";
import { shareCard } from "../content";
import {
  familiarRoles,
  isLane,
  listPeople,
  listProjects,
  openSeatsByRole,
  tagCounts,
  type Lane,
  type ProjectSummary,
} from "../lib/data";
import { normaliseRole, roleLabel, ROLES, type Role } from "../lib/roles";
import { isStage, stageMeta, STAGES, type Stage } from "../lib/stages";
import { currentViewer } from "../lib/session";

export const dynamic = "force-dynamic";

const title = "Cari Kolaborasi — Ahsan Project";
const description = "Cari project, saring berdasarkan kategori, level, dan role, lalu temukan tempat terbaik untuk ikut berkontribusi.";

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
  const needs = one(params.needs) === "open" || askedLane === "butuh-bantuan" ? "open" : "";

  const viewer = await currentViewer();
  const familiar = viewer && sort === "untukmu" ? await familiarRoles(viewer.id) : [];
  const query = {
    lane: sort,
    stage,
    tag,
    role,
    q,
    needsHelp: needs === "open",
    familiarRoles: familiar,
  };

  const [projects, topics, helpBoard, people] = await Promise.all([
    listProjects(query),
    tagCounts({
      lane: sort,
      stage,
      role,
      q,
      needsHelp: needs === "open",
      familiarRoles: familiar,
    }),
    listProjects({ lane: "butuh-bantuan" }),
    listPeople(400),
  ]);
  const seatsByRole = await openSeatsByRole(projects.map((project) => project.id));
  const rankedRoles = rankRoles(helpBoard).slice(0, 5);
  const filtered = Boolean(stage || tag || role || q || needs);
  const currentPath = linkTo({ lane: sort, stage, tag, role, q, needs });

  return (
    <>
      <SiteHeader returnTo={currentPath} active="kolaborasi" />

      <main id="main-content" className="discovery-page collaboration-page">
        <section className="collaboration-hero" aria-labelledby="collaboration-title">
          <div>
            <p className="home-eyebrow">temukan tempat untuk ikut bertumbuh</p>
            <h1 id="collaboration-title">Cari project kolaborasi</h1>
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

        <section className="collaboration-panel" aria-label="Cari, filter, dan urutkan project">
          <div className="collaboration-toolbar">
            <form className="discovery-search collaboration-search" method="get" action="/kolaborasi" role="search">
              {stage ? <input type="hidden" name="stage" value={stage} /> : null}
              {tag ? <input type="hidden" name="tag" value={tag} /> : null}
              {role ? <input type="hidden" name="role" value={role} /> : null}
              {needs ? <input type="hidden" name="needs" value={needs} /> : null}
              {sort === "untukmu" ? null : <input type="hidden" name="lane" value={sort} />}
              <label>
                <SearchIcon />
                <span className="sr-only">Cari project, program, atau kata kunci</span>
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Cari project, program, atau kata kunci…"
                  autoComplete="off"
                />
              </label>
              <button type="submit">Cari</button>
            </form>

            <div className="collaboration-control collaboration-sort-control">
              <span>Urutkan</span>
              <SortSelect
                action="/kolaborasi"
                name="lane"
                value={sort}
                label="Urutkan project"
                options={SORTS}
                hidden={{ stage, tag, role, q, needs }}
              />
            </div>
          </div>

          <div className="collaboration-filter-grid">
            <div className="collaboration-control">
              <span>Kategori</span>
              <SortSelect
                action="/kolaborasi"
                name="tag"
                value={tag}
                label="Filter kategori"
                options={[
                  { value: "", label: "Semua kategori" },
                  ...withSelectedTopic(topics, tag).map((topic) => ({
                    value: topic.tag,
                    label: `${topic.tag} (${topic.count})`,
                  })),
                ]}
                hidden={{ stage, role, q, needs, lane: sort === "untukmu" ? "" : sort }}
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
                hidden={{ tag, role, q, needs, lane: sort === "untukmu" ? "" : sort }}
              />
            </div>

            <div className="collaboration-control">
              <span>Role yang dicari</span>
              <SortSelect
                action="/kolaborasi"
                name="role"
                value={role}
                label="Filter role yang dicari"
                options={[
                  { value: "", label: "Semua role" },
                  ...ROLES.map((entry) => ({ value: entry, label: roleLabel(entry) })),
                ]}
                hidden={{ stage, tag, q, needs, lane: sort === "untukmu" ? "" : sort }}
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
                hidden={{ stage, tag, role, q, lane: sort === "untukmu" ? "" : sort }}
              />
            </div>
          </div>
        </section>

        {filtered ? (
          <div className="active-filters home-active-filters" aria-label="Saringan aktif">
            <ul>
              {role ? (
                <li>
                  <Link href={linkTo({ lane: sort, stage, tag, q, needs })}>
                    Role: <strong>{roleLabel(role)}</strong> <span>×</span>
                  </Link>
                </li>
              ) : null}
              {tag ? <li><Link href={linkTo({ lane: sort, stage, role, q, needs })}>Kategori: <strong>{tag}</strong> <span>×</span></Link></li> : null}
              {stage ? <li><Link href={linkTo({ lane: sort, tag, role, q, needs })}>Level: <strong>{stageMeta[stage].label}</strong> <span>×</span></Link></li> : null}
              {needs ? <li><Link href={linkTo({ lane: sort, stage, tag, role, q })}>Kebutuhan: <strong>Mencari kolaborator</strong> <span>×</span></Link></li> : null}
              {q ? <li><Link href={linkTo({ lane: sort, stage, tag, role, needs })}>Pencarian: <strong>“{q}”</strong> <span>×</span></Link></li> : null}
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
              <Link href="/new">Tampilkan project</Link>
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
                      <Link href={linkTo({ lane: sort, stage, tag, role: entry.role, q, needs: "open" })}>
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
              <Link className="all-roles-link" href="/kolaborasi?needs=open">
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
  needs?: string;
}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && !(key === "lane" && value === "untukmu")) params.set(key, value);
  }
  const search = params.toString();
  return search ? `/kolaborasi?${search}` : "/kolaborasi";
}
