import type { Metadata } from "next";
import Link from "next/link";
import { homeMeta, shareCard } from "../content";
import { BoardCard, initials } from "../components/pieces";
import { SortSelect } from "../components/sort-select";
import { Arrow, SiteFooter, SiteHeader } from "../components/shell";
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
import { normaliseRole, roleLabel, type Role } from "../lib/roles";
import { isStage, stageMeta, type Stage } from "../lib/stages";
import { currentViewer } from "../lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: homeMeta.title,
  description: homeMeta.description,
  alternates: { canonical: "/" },
  openGraph: shareCard({ title: homeMeta.title, description: homeMeta.description, url: "/" }),
};

const SORTS: { value: Lane; label: string }[] = [
  { value: "untukmu", label: "Pilihan" },
  { value: "terbaru", label: "Terbaru" },
  { value: "aktif", label: "Paling aktif" },
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
  const role = normaliseRole(one(params.role)) ?? "";
  const tag = one(params.tag);
  const q = one(params.q);

  const viewer = await currentViewer();
  const mine = viewer && sort === "untukmu" ? await familiarRoles(viewer.id) : [];

  const [scoped, topics, helpBoard, people] = await Promise.all([
    listProjects({ lane: sort, tag, role, q, familiarRoles: mine }),
    tagCounts({ lane: sort, stage, role, q, familiarRoles: mine }),
    listProjects({ lane: "butuh-bantuan", tag, q }),
    listPeople(400),
  ]);
  const projects = stage ? scoped.filter((project) => project.stage === stage) : scoped;
  const seatsByRole = await openSeatsByRole(projects.map((project) => project.id));
  const rankedRoles = rankRoles(helpBoard).slice(0, 5);
  const filtered = Boolean(stage || tag || role || q);

  return (
    <>
      <SiteHeader returnTo="/" active="jelajah" />

      <main id="main-content" className="discovery-page">
        <section className="discovery-hero" aria-labelledby="discovery-title">
          <div className="discovery-hero-copy">
            <p className="home-eyebrow">Karya · Project · Program</p>
            <h1 id="discovery-title">Temukan project yang layak dibantu.</h1>
            <p>
              Lihat apa yang sedang dibangun, temukan peran yang cocok, lalu tumbuh bersama lewat
              kontribusi nyata.
            </p>
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

        <div className="discovery-controls">
          <form className="discovery-search" method="get" action="/" role="search">
            {stage ? <input type="hidden" name="stage" value={stage} /> : null}
            {tag ? <input type="hidden" name="tag" value={tag} /> : null}
            {role ? <input type="hidden" name="role" value={role} /> : null}
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
              <kbd aria-hidden="true">⌘ K</kbd>
            </label>
          </form>

          <SortSelect
            name="tag"
            value={tag}
            label="Pilih kategori"
            options={[
              { value: "", label: "Semua kategori" },
              ...topics.map((topic) => ({ value: topic.tag, label: `${topic.tag} (${topic.count})` })),
            ]}
            hidden={{ stage, role, q, lane: sort === "untukmu" ? "" : sort }}
          />
        </div>

        {filtered ? (
          <div className="active-filters home-active-filters" aria-label="Saringan aktif">
            <ul>
              {role ? (
                <li>
                  <Link href={linkTo({ lane: sort, stage, tag, q })}>
                    Menampilkan kebutuhan untuk <strong>{roleLabel(role)}</strong> <span>×</span>
                  </Link>
                </li>
              ) : null}
              {tag ? <li><Link href={linkTo({ lane: sort, stage, role, q })}>Kategori: <strong>{tag}</strong> <span>×</span></Link></li> : null}
              {stage ? <li><Link href={linkTo({ lane: sort, tag, role, q })}>Tahap: <strong>{stageMeta[stage].label}</strong> <span>×</span></Link></li> : null}
              {q ? <li><Link href={linkTo({ lane: sort, stage, tag, role })}>Pencarian: <strong>“{q}”</strong> <span>×</span></Link></li> : null}
            </ul>
            <Link className="clear-filters" href={linkTo({ lane: sort })}>Hapus semua</Link>
          </div>
        ) : null}

        <div className="discovery-content">
          <section className="home-projects" aria-labelledby="project-list-title">
            <div className="home-list-head">
              <div>
                <h2 id="project-list-title">Project pilihan</h2>
                <p>Dikurasi dari komunitas minggu ini</p>
              </div>
              <nav className="home-sort-tabs" aria-label="Urutan project">
                {SORTS.map((option) => (
                  <Link
                    key={option.value}
                    className={sort === option.value ? "is-active" : ""}
                    aria-current={sort === option.value ? "page" : undefined}
                    href={linkTo({ lane: option.value, stage, tag, role, q })}
                  >
                    {option.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="feed" aria-label="Daftar proyek">
              {projects.length === 0 ? (
                <div className="empty home-empty">
                  <p>Belum ada project yang cocok dengan pencarian ini.</p>
                  <Link href="/">Lihat semua project</Link>
                </div>
              ) : (
                <ul className="board-grid">
                  {projects.map((project, index) => (
                    <BoardCard
                      key={project.id}
                      project={project}
                      rank={index + 1}
                      roleCounts={seatsByRole.get(project.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>

          <aside className="discovery-sidebar" aria-label="Mulai berkontribusi">
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
                      <Link href={linkTo({ lane: sort, stage, tag, role: entry.role, q })}>
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

              <Link className="all-roles-link" href="/?lane=butuh-bantuan">
                Lihat semua role <Arrow />
              </Link>
            </section>

            <section className="show-project-card">
              <span className="show-project-plus" aria-hidden="true">+</span>
              <h2>Punya sesuatu yang sedang dibangun?</h2>
              <p>Tunjukkan project-mu dan temukan orang yang bisa membawanya lebih jauh.</p>
              <Link href="/new">Tampilkan project</Link>
              <small>Gratis untuk komunitas</small>
            </section>

            <p className="quality-note">
              <span aria-hidden="true">✦</span>
              <span><strong>Bukan sekadar etalase.</strong> Setiap project harus menjelaskan progres dan kontribusi yang benar-benar dibutuhkan.</span>
            </p>
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
    const roles = new Set(project.openRoles.map(normaliseRole).filter((role): role is Role => Boolean(role)));
    for (const role of roles) counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count || roleLabel(a.role).localeCompare(roleLabel(b.role), "id"));
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
