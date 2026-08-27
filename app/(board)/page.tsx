import type { Metadata } from "next";
import Link from "next/link";
import { homeMeta, shareCard } from "../content";
import { PersonPhoto } from "../components/person-photo";
import { Arrow, SiteFooter, SiteHeader } from "../components/shell";
import { listPeople, listProjects } from "../lib/data";
import type { Stage } from "../lib/stages";

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

  return (
    <>
      <SiteHeader returnTo="/" active="beranda" />

      <main id="main-content" className="landing-page">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <h1 id="landing-title">Show Your Project,<br/> Build Portfolio,<br/> <span className="hero-highlight">Find Collaborators</span></h1>
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
                  <PersonPhoto key={person.id} name={person.name} photoUrl={person.photoUrl} />
                ))}
                <span className="pulse-plus">+</span>
              </div>
              <p>
                <strong>{people.length} orang</strong> sudah buat project, siap berkolaborasi.
              </p>
            </div>
          </div>
        </section>

        <section className="landing-stats" aria-labelledby="landing-stats-title">
          <div className="landing-stats-heading">
            <div>
              <p className="home-eyebrow">statistik ahsanproject</p>
              <h2 id="landing-stats-title">Project, orang, dan kolaborasi dalam angka</h2>
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
            <h2 id="purpose-title">Satu Platform, Tiga Tujuan</h2>
            <p>
              Project dan orang saling terhubung. Kamu bisa melihat siapa membuat project dan siapa
              yang ikut mengerjakannya.
            </p>
          </div>

          <div className="purpose-grid">
            <article className="purpose-card purpose-project">
              <LandingIcon kind="showcase" />
              <p className="purpose-number">PROJECT SHOWCASE</p>
              <h3>Tunjukkan Projectmu</h3>
              <p>
                Bagikan project yang sedang kamu bangun, ceritakan progresnya, dan tunjukkan hasil
                kerjamu.
              </p>
              <Link href="/new">Tambah project <Arrow /></Link>
            </article>

            <article className="purpose-card purpose-portfolio">
              <LandingIcon kind="contribution" />
              <p className="purpose-number">OPEN CONTRIBUTION</p>
              <h3>Temukan Tempat Kontribusi</h3>
              <p>
                Jelajahi project yang terbuka, temukan peran yang sesuai, lalu ajukan diri untuk
                ikut berkontribusi.
              </p>
              <Link href="/kolaborasi">Lihat peluang kontribusi <Arrow /></Link>
            </article>

            <article className="purpose-card purpose-talent">
              <LandingIcon kind="invite" />
              <p className="purpose-number">OPEN COLLABORATION</p>
              <h3>Buka Peluang Kolaborasi</h3>
              <p>
                Jelaskan bantuan yang dibutuhkan di projectmu, buka peran yang tersedia, dan ajak
                orang untuk ikut berkontribusi.
              </p>
              <Link href="/new">Buka kebutuhan kolaborasi <Arrow /></Link>
            </article>
          </div>
        </section>

        <section className="talent-story" aria-labelledby="talent-story-title">
          <div className="talent-story-copy">
            <p className="home-eyebrow">Tidak hanya showcase project</p>
            <h2 id="talent-story-title">Jadi Talent Pool Biar Terlihat Sama <span className="hero-highlight">Recruiter</span></h2>
            <p>
              Setelah kontribusi, orang lain melihat project yang dibuat, kontribusi yang dikerjakan,
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
                      <PersonPhoto className="talent-avatar" name={person.name} photoUrl={person.photoUrl} />
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

        <section className="portfolio-story" aria-labelledby="portfolio-story-title">
          <div className="portfolio-story-copy">
            <p className="home-eyebrow">portfolio aktif</p>
            <h2 id="portfolio-story-title">Profilmu adalah portfolio yang terus tumbuh.</h2>
            <p>
              Setiap project yang kamu buat, peran yang kamu ambil, dan kontribusi yang kamu
              selesaikan otomatis membentuk rekam jejak kerja di satu halaman.
            </p>
            <ul>
              <li><span>01</span> Tampilkan project yang sedang dan pernah kamu bangun</li>
              <li><span>02</span> Buktikan skill dan peran lewat pekerjaan nyata</li>
              <li><span>03</span> Bagikan satu tautan sebagai portfolio personalmu</li>
            </ul>
            <a className="portfolio-story-link" href="https://ahsanproject.id/u/zikrul-ihsan">
              Lihat contoh portfolio <Arrow />
            </a>
          </div>

          <a
            className="portfolio-preview"
            href="https://ahsanproject.id/u/zikrul-ihsan"
            aria-label="Lihat portfolio Zikrul Ihsan"
          >
            <div className="portfolio-preview-label">
              <span>PORTOFOLIO PERSONAL</span>
              <i><b /> Portfolio aktif</i>
            </div>
            <div className="portfolio-preview-person">
              <span className="portfolio-preview-avatar" aria-hidden="true">ZI</span>
              <div>
                <h3>Zikrul Ihsan</h3>
                <p>Software Engineer · Community Builder</p>
              </div>
            </div>
            <p className="portfolio-preview-bio">
              Membangun produk digital, komunitas, dan project yang bisa dipakai banyak orang.
            </p>
            <ul className="portfolio-preview-skills" aria-label="Skill Zikrul Ihsan">
              <li>5 th pengalaman</li>
              <li>Python</li>
              <li>AI Engineering</li>
            </ul>
            <div className="portfolio-preview-proof">
              <div>
                <strong>6</strong>
                <span>project dibangun</span>
              </div>
              <div>
                <span>Beberapa project</span>
                <p>Swegrowth · Main Aman · CariKontak</p>
              </div>
            </div>
            <span className="portfolio-preview-url">
              ahsanproject.id/u/zikrul-ihsan <Arrow diagonal />
            </span>
          </a>
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

function LandingIcon({ kind }: { kind: "showcase" | "contribution" | "invite" }) {
  if (kind === "showcase") {
    return (
      <svg className="landing-purpose-icon" viewBox="0 0 40 40" aria-hidden="true">
        <rect x="7.5" y="9" width="25" height="22" rx="2.5" />
        <path d="M7.5 15h25M12 12h.01M16 12h.01" />
        <circle cx="15" cy="21" r="2.5" />
        <path d="m11 28 6-5 4 3.5 3-3 5 4.5" />
      </svg>
    );
  }
  if (kind === "contribution") {
    return (
      <svg className="landing-purpose-icon" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="17" cy="17" r="8.5" />
        <path d="m23.5 23.5 8 8M17 12.5v9M12.5 17h9" />
      </svg>
    );
  }
  return (
    <svg className="landing-purpose-icon" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="14.5" cy="15" r="4.5" />
      <path d="M6.5 30c.8-5.5 3.4-8 8-8s7.2 2.5 8 8M28 12.5v11M22.5 18h11" />
    </svg>
  );
}
