import type { Metadata } from "next";
import Link from "next/link";
import { homeMeta, shareCard } from "../content";
import { initials } from "../components/pieces";
import { ProjectLogo } from "../components/project-logo";
import { Arrow, SiteFooter, SiteHeader } from "../components/shell";
import { listPeople, listProjects } from "../lib/data";
import { roleLabel } from "../lib/roles";
import { stageMeta, type Stage } from "../lib/stages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: homeMeta.title,
  description: homeMeta.description,
  alternates: { canonical: "/" },
  openGraph: shareCard({ title: homeMeta.title, description: homeMeta.description, url: "/" }),
};

const STAGE_SUMMARIES: { stage: Stage; label: string }[] = [
  { stage: "idea", label: "Masih berupa ide" },
  { stage: "building", label: "Sedang dibangun" },
  { stage: "live", label: "Sudah berjalan" },
  { stage: "resting", label: "Diistirahatkan" },
];

export default async function Home() {
  const [projects, people] = await Promise.all([
    listProjects({ lane: "terbaru" }),
    listPeople(400),
  ]);

  const openContributions = projects.reduce((total, project) => total + project.openSeatCount, 0);
  const movingProjects = projects.filter(
    (project) => project.stage === "building" || project.stage === "live",
  ).length;
  const stageSummaries = STAGE_SUMMARIES.map((entry) => ({
    ...entry,
    count: projects.filter((project) => project.stage === entry.stage).length,
  }));
  const largestStage = Math.max(...stageSummaries.map((entry) => entry.count), 1);
  const popularTopics = rankTopics(projects).slice(0, 5);
  const featuredProject =
    projects.find((project) => project.openSeatCount > 0 && project.nowText) ??
    projects.find((project) => project.openSeatCount > 0) ??
    projects[0];

  return (
    <>
      <SiteHeader returnTo="/" active="beranda" />

      <main id="main-content" className="landing-page">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <p className="home-eyebrow">Wadah Kolaborasi Lintas Peran</p>
            <h1 id="landing-title">Bagikan,<br/> Temukan,<br/> <span className="hero-highlight">Berkolaborasi</span></h1>
            <p className="landing-hero-lead">
              Bagikan project terbaikmu, temukan tempat kontribusi, dan bangun portfolio dengan kolaborasi.
            </p>

            <div className="home-hero-actions" aria-label="Mulai menggunakan AhsanProject">
              <Link className="home-hero-primary" href="/new">
                <span aria-hidden="true">+</span> Tambah Project
              </Link>
              <Link className="home-hero-secondary" href="/kolaborasi">
                Cari Tempat Kontribusi <Arrow />
              </Link>
            </div>

            <div className="landing-community-proof">
              <div className="pulse-avatars" aria-hidden="true">
                {people.slice(0, 3).map((person) => (
                  <span key={person.id}>{initials(person.name)}</span>
                ))}
                <span className="pulse-plus">+</span>
              </div>
              <p>
                <strong>{people.length} orang</strong> sudah buat project, siap berkolaborasi.
              </p>
            </div>
          </div>

          {featuredProject ? (
            <aside className="collaboration-example" aria-label={`Contoh project kolaborasi: ${featuredProject.title}`}>
              <div className="collaboration-example-head">
                <span>Contoh project kolaborasi</span>
                {featuredProject.openSeatCount > 0 ? (
                  <strong><i aria-hidden="true" /> Mencari {featuredProject.openSeatCount} orang</strong>
                ) : (
                  <strong>Project aktif</strong>
                )}
              </div>

              <div className="collaboration-example-project">
                <ProjectLogo
                  title={featuredProject.title}
                  website={featuredProject.liveUrl}
                  fallback={featuredProject.glyph}
                  className="collaboration-example-logo"
                />
                <div>
                  <span>{stageMeta[featuredProject.stage].label}</span>
                  <h2>{featuredProject.title}</h2>
                  <p>{featuredProject.tagline}</p>
                </div>
              </div>

              {featuredProject.nowText ? (
                <div className="collaboration-example-now">
                  <span>Sedang dikerjakan</span>
                  <p>{featuredProject.nowText}</p>
                </div>
              ) : null}

              <div className="collaboration-example-roles">
                <span>Bantuan yang dicari</span>
                {featuredProject.openRoles.length > 0 ? (
                  <ul>
                    {featuredProject.openRoles.slice(0, 3).map((role) => (
                      <li key={role}>
                        <Link href={`/kolaborasi?role=${encodeURIComponent(role)}`}>{roleLabel(role)}</Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Belum membuka posisi kolaborasi.</p>
                )}
              </div>

              <div className="collaboration-example-foot">
                <Link href={`/u/${featuredProject.owner.username}`}>
                  <span aria-hidden="true">{initials(featuredProject.owner.name)}</span>
                  <small>Dibuat oleh <strong>{featuredProject.owner.name}</strong></small>
                </Link>
                <Link href={`/projects/${featuredProject.slug}`}>
                  Lihat project <Arrow />
                </Link>
              </div>
            </aside>
          ) : (
            <aside className="collaboration-example collaboration-example-empty">
              <span>Contoh project kolaborasi</span>
              <h2>Project pertamamu bisa tampil di sini.</h2>
              <Link href="/new">Tambah Project <Arrow /></Link>
            </aside>
          )}
        </section>

        <section className="landing-stats" aria-labelledby="landing-stats-title">
          <div className="landing-stats-heading">
            <div>
              <p className="home-eyebrow">statistik ahsanproject</p>
              <h2 id="landing-stats-title">Project, orang, dan posisi kolaborasi.</h2>
            </div>
            <p>Data ini diperbarui dari project dan profil yang ada di AhsanProject.</p>
          </div>

          <div className="ecosystem-card" aria-label="Ringkasan isi AhsanProject">
            <div className="ecosystem-card-head">
              <div>
                <span className="live-dot" aria-hidden="true" />
                <p>Yang ada di AhsanProject</p>
              </div>
              <span>Data terbaru</span>
            </div>

            <div className="ecosystem-overview">
              <div className="ecosystem-main-stat">
                <strong>{projects.length}</strong>
                <p>
                  project sudah dibagikan
                  <small>{movingProjects} sedang dibangun atau sudah berjalan</small>
                </p>
              </div>

              <div className="ecosystem-stats">
                <div>
                  <strong>{people.length}</strong>
                  <span>orang sudah bergabung</span>
                </div>
                <div>
                  <strong>{openContributions}</strong>
                  <span>posisi kolaborasi dibuka</span>
                </div>
              </div>
            </div>

            <div className="ecosystem-details">
              <div className="ecosystem-stages" aria-label="Project berdasarkan fase">
                {stageSummaries.map((entry) => (
                  <div className="ecosystem-stage" key={entry.stage}>
                    <span>{entry.label}</span>
                    <i aria-hidden="true">
                      <b style={{ width: `${(entry.count / largestStage) * 100}%` }} />
                    </i>
                    <strong>{entry.count}</strong>
                  </div>
                ))}
              </div>

              {popularTopics.length > 0 ? (
                <div className="ecosystem-topics">
                  <span>Topik project</span>
                  <ul>
                    {popularTopics.map((topic) => (
                      <li key={topic.tag}>
                        <Link href={`/kolaborasi?tag=${encodeURIComponent(topic.tag)}`}>#{topic.tag}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="landing-purpose" aria-labelledby="purpose-title">
          <div className="landing-section-intro">
            <p className="home-eyebrow">yang bisa kamu lakukan</p>
            <h2 id="purpose-title">Buat project, cari kolaborator, dan tunjukkan hasil kerja.</h2>
            <p>
              Project dan orang saling terhubung. Kamu bisa melihat siapa membuat project dan siapa
              yang ikut mengerjakannya.
            </p>
          </div>

          <div className="purpose-grid">
            <article className="purpose-card purpose-project">
              <LandingIcon kind="project" />
              <p className="purpose-number">01 · BAGIKAN PROJECT</p>
              <h3>Tambah project yang sedang kamu kerjakan.</h3>
              <p>
                Tulis tujuan project, progres saat ini, dan bantuan yang sedang dibutuhkan.
              </p>
              <Link href="/kolaborasi">Lihat semua project <Arrow /></Link>
            </article>

            <article className="purpose-card purpose-portfolio">
              <LandingIcon kind="portfolio" />
              <p className="purpose-number">02 · BUAT PORTFOLIO</p>
              <h3>Jadikan kontribusi sebagai portfolio.</h3>
              <p>
                Project, peran, dan tugas yang kamu kerjakan muncul di profil sebagai bukti kerja.
              </p>
              <Link href="/orang">Lihat contoh profil <Arrow /></Link>
            </article>

            <article className="purpose-card purpose-talent">
              <LandingIcon kind="people" />
              <p className="purpose-number">03 · CARI ORANG</p>
              <h3>Cari orang untuk diajak kerja bareng.</h3>
              <p>
                Cari berdasarkan profesi, skill, pengalaman, serta project yang dibuat dan dibantu.
              </p>
              <Link href="/orang">Cari orang <Arrow /></Link>
            </article>
          </div>
        </section>

        <section className="talent-story" aria-labelledby="talent-story-title">
          <div className="talent-story-copy">
            <p className="home-eyebrow">cari kolaborator</p>
            <h2 id="talent-story-title">Cari orang dari pekerjaan yang sudah mereka lakukan.</h2>
            <p>
              Buka profil seseorang untuk melihat project yang dibuat, kontribusi yang dikerjakan,
              dan skill yang dipakai.
            </p>
            <ul>
              <li><span>✓</span> Lihat project yang pernah dibuat</li>
              <li><span>✓</span> Lihat kontribusi di project orang lain</li>
              <li><span>✓</span> Cari berdasarkan profesi, skill, dan pengalaman</li>
            </ul>
            <Link className="talent-story-link" href="/orang">
              Cari orang <Arrow />
            </Link>
          </div>

          <div className="talent-preview" aria-label="Beberapa orang di AhsanProject">
            <div className="talent-preview-head">
              <span>Orang yang siap berkolaborasi</span>
              <Link href="/orang">Lihat semua</Link>
            </div>

            {people.length > 0 ? (
              <ul>
                {people.slice(0, 4).map((person) => (
                  <li key={person.id}>
                    <Link href={`/u/${person.username}`}>
                      <span className="talent-avatar" aria-hidden="true">{initials(person.name)}</span>
                      <span className="talent-person-copy">
                        <strong>{person.name}</strong>
                        <small>{person.profession || person.headline || "Kolaborator"}</small>
                      </span>
                      <span className="talent-skills" aria-label={`Skill ${person.name}`}>
                        {person.skills.slice(0, 2).map((skill) => <i key={skill}>{skill}</i>)}
                      </span>
                      <Arrow />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="talent-preview-empty">
                <p>Jadilah orang pertama yang menunjukkan karya di sini.</p>
                <Link href="/signup">Buat profil</Link>
              </div>
            )}
          </div>
        </section>

        <section className="how-it-works" aria-labelledby="how-title">
          <div className="how-heading">
            <div>
              <p className="home-eyebrow">cara kerjanya</p>
              <h2 id="how-title">Tambah project. Cari orang. Mulai berkolaborasi.</h2>
            </div>
            <p>
              Tidak perlu menunggu project selesai. Bagikan sejak masih berupa ide, lalu perbarui
              progresnya selama dikerjakan.
            </p>
          </div>

          <ol className="how-steps">
            <li>
              <span>01</span>
              <div className="how-step-mark" aria-hidden="true">⌁</div>
              <h3>Tambah project</h3>
              <p>Jelaskan tujuan project, target pengguna, dan progres saat ini.</p>
            </li>
            <li>
              <span>02</span>
              <div className="how-step-mark" aria-hidden="true">＋</div>
              <h3>Buka posisi</h3>
              <p>Tulis bantuan, role, dan waktu yang kamu butuhkan.</p>
            </li>
            <li>
              <span>03</span>
              <div className="how-step-mark" aria-hidden="true">↗</div>
              <h3>Mulai kerja bareng</h3>
              <p>Orang bisa mengajukan diri dan mengambil tugas di project.</p>
            </li>
            <li>
              <span>04</span>
              <div className="how-step-mark" aria-hidden="true">✦</div>
              <h3>Jadi portfolio</h3>
              <p>Project dan kontribusi yang selesai tampil di profilmu.</p>
            </li>
          </ol>
        </section>

        <section className="landing-final-cta" aria-labelledby="final-cta-title">
          <p className="home-eyebrow">punya project?</p>
          <h2 id="final-cta-title">Tambah project dan cari orang untuk mengerjakannya bersama.</h2>
          <p>Gratis untuk komunitas.</p>
          <div>
            <Link className="home-hero-primary" href="/new"><span aria-hidden="true">+</span> Tambah Project</Link>
            <Link className="landing-final-secondary" href="/kolaborasi">Cari Tempat Kontribusi <Arrow /></Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function rankTopics(projects: Awaited<ReturnType<typeof listProjects>>): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const project of projects) {
    for (const tag of new Set(project.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "id"));
}

function LandingIcon({ kind }: { kind: "project" | "portfolio" | "people" }) {
  if (kind === "project") {
    return (
      <svg className="landing-purpose-icon" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M8 11.5h9l2.5 3H32v17H8z" />
        <path d="M13 23h14M20 18v10" />
      </svg>
    );
  }
  if (kind === "portfolio") {
    return (
      <svg className="landing-purpose-icon" viewBox="0 0 40 40" aria-hidden="true">
        <rect x="9" y="7" width="22" height="26" rx="2" />
        <path d="M15 14h10M15 20h10M15 26h6" />
      </svg>
    );
  }
  return (
    <svg className="landing-purpose-icon" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="16" cy="16" r="5" />
      <circle cx="27" cy="18" r="3.5" />
      <path d="M7.5 31c.7-5.4 3.5-8 8.5-8s7.8 2.6 8.5 8M24 24.5c4.8-.5 7.5 1.7 8 6.5" />
    </svg>
  );
}
