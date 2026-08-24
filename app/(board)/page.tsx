import type { Metadata } from "next";
import Link from "next/link";
import { homeMeta, shareCard } from "../content";
import { BoardCard, initials } from "../components/pieces";
import { Arrow, SiteFooter, SiteHeader } from "../components/shell";
import {
  familiarRoles,
  listPeople,
  listProjects,
  openSeatsByRole,
  type ProjectSummary,
} from "../lib/data";
import { normaliseRole, roleLabel, type Role } from "../lib/roles";
import { currentViewer } from "../lib/session";

const HERO_EXAMPLES = [
  {
    title: "Ruang Tumbuh",
    category: "Edukasi",
    summary: "Kelas belajar bareng yang dibuat ringan, dekat, dan mudah diikuti.",
    stage: "Sedang dibangun",
    role: "UI/UX Designer",
    glyph: "RT",
    tone: "sage",
  },
  {
    title: "Pasar Tetangga",
    category: "UMKM",
    summary: "Membantu produk rumahan bertemu pembeli di lingkungan terdekat.",
    stage: "Ide tervalidasi",
    role: "Frontend Developer",
    glyph: "PT",
    tone: "coral",
  },
  {
    title: "Jalan Bareng",
    category: "Komunitas",
    summary: "Ruang untuk menemukan kegiatan sosial dan bergerak bersama.",
    stage: "Sudah berjalan",
    role: "Content Strategist",
    glyph: "JB",
    tone: "blue",
  },
] as const;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: homeMeta.title,
  description: homeMeta.description,
  alternates: { canonical: "/" },
  openGraph: shareCard({ title: homeMeta.title, description: homeMeta.description, url: "/" }),
};

export default async function Home() {
  const viewer = await currentViewer();
  const familiar = viewer ? await familiarRoles(viewer.id) : [];
  const [projects, helpBoard, people] = await Promise.all([
    listProjects({ lane: "untukmu", familiarRoles: familiar }),
    listProjects({ lane: "butuh-bantuan" }),
    listPeople(400),
  ]);
  const seatsByRole = await openSeatsByRole(projects.map((project) => project.id));
  const rankedRoles = rankRoles(helpBoard).slice(0, 5);

  return (
    <>
      <SiteHeader returnTo="/" active="beranda" />

      <main id="main-content" className="discovery-page">
        <section className="discovery-hero" aria-labelledby="discovery-title">
          <div className="discovery-hero-copy">
            <p className="home-eyebrow">berkarya, berkolaborasi, berdampak</p>
            <h1 id="discovery-title">Bagikan dan Temukan Project Untuk Kolaborasi</h1>
            <p className="home-hero-lead">
              Lihat apa yang sedang dibangun, temukan peran yang cocok, lalu tumbuh bersama lewat
              kontribusi nyata.
            </p>

            <div className="home-hero-actions" aria-label="Mulai dari beranda">
              <Link className="home-hero-primary" href="/new">
                <span aria-hidden="true">+</span> Bagikan project
              </Link>
              <Link className="home-hero-secondary" href="/kolaborasi">
                Cari project kolaborasi <Arrow />
              </Link>
            </div>
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

        <section className="hero-examples" aria-labelledby="hero-examples-title">
          <div className="hero-examples-note">
            <h2 id="hero-examples-title">Ini beberapa contohnya</h2>
            <svg viewBox="0 0 52 42" aria-hidden="true">
              <path d="M8 4c1 16 12 25 32 27" />
              <path d="m32 24 9 7-10 5" />
            </svg>
          </div>

          <ul>
            {HERO_EXAMPLES.map((example) => (
              <li key={example.title}>
                <Link
                  className="hero-example-card"
                  href="/kolaborasi"
                  aria-label={`Cari project seperti ${example.title} di halaman kolaborasi`}
                >
                  <div className="hero-example-top">
                    <span className={`hero-example-glyph tone-${example.tone}`} aria-hidden="true">
                      {example.glyph}
                    </span>
                    <span className="hero-example-stage">{example.stage}</span>
                  </div>
                  <p className="hero-example-category">{example.category}</p>
                  <h3>{example.title}</h3>
                  <p className="hero-example-summary">{example.summary}</p>
                  <div className="hero-example-footer">
                    <span>
                      Mencari <strong>{example.role}</strong>
                    </span>
                    <span className="hero-example-arrow">
                      <Arrow />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="discovery-content home-discovery-content">
          <section className="home-projects" aria-labelledby="project-list-title">
            <div className="home-list-head">
              <div>
                <h2 id="project-list-title">Project pilihan</h2>
                <p>Dikurasi dari komunitas minggu ini</p>
              </div>
              <Link className="home-see-all" href="/kolaborasi">
                Lihat semua <Arrow />
              </Link>
            </div>

            <div className="feed" aria-label="Daftar proyek">
              {projects.length === 0 ? (
                <div className="empty home-empty">
                  <p>Belum ada project yang bisa ditampilkan.</p>
                  <Link href="/new">Bagikan project pertama</Link>
                </div>
              ) : (
                <ul className="board-grid">
                  {projects.map((project) => (
                    <BoardCard
                      key={project.id}
                      project={project}
                      roleCounts={seatsByRole.get(project.id)}
                      appearance="profile"
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>

          <aside className="discovery-sidebar" aria-label="Mulai berkontribusi">
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
                      <Link href={`/kolaborasi?role=${encodeURIComponent(entry.role)}`}>
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
