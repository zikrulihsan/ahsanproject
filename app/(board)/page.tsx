import type { Metadata } from "next";
import Link from "next/link";
import { homeMeta, shareCard } from "../content";
import { initials } from "../components/pieces";
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
            <p className="home-eyebrow">show your work · find your people</p>
            <h1 id="landing-title">
              Tempat karya tumbuh, <em>dan orang menemukan tempatnya.</em>
            </h1>
            <p className="landing-hero-lead">
              AhsanProject adalah rumah untuk menunjukkan apa yang sedang kamu bangun,
              menemukan teman kolaborasi, dan membiarkan jejak kerja nyata tumbuh menjadi portfolio.
            </p>

            <div className="home-hero-actions" aria-label="Mulai menggunakan AhsanProject">
              <Link className="home-hero-primary" href="/new">
                <span aria-hidden="true">+</span> Tampilkan project
              </Link>
              <Link className="home-hero-secondary" href="/kolaborasi">
                Cari tempat berkontribusi <Arrow />
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
                <strong>{people.length} orang</strong> membangun dan membantu secara terbuka.
              </p>
            </div>
          </div>

          <aside className="ecosystem-card" aria-label="Ringkasan AhsanProject hari ini">
            <div className="ecosystem-card-head">
              <div>
                <span className="live-dot" aria-hidden="true" />
                <p>AhsanProject hari ini</p>
              </div>
              <span>Live summary</span>
            </div>

            <div className="ecosystem-main-stat">
              <strong>{projects.length}</strong>
              <p>
                project punya rumah untuk tumbuh
                <small>{movingProjects} di antaranya sedang bergerak</small>
              </p>
            </div>

            <div className="ecosystem-stats">
              <div>
                <strong>{people.length}</strong>
                <span>orang dengan profil karya</span>
              </div>
              <div>
                <strong>{openContributions}</strong>
                <span>ruang kontribusi terbuka</span>
              </div>
            </div>

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
                <span>Yang sedang dibangun</span>
                <ul>
                  {popularTopics.map((topic) => (
                    <li key={topic.tag}>
                      <Link href={`/kolaborasi?tag=${encodeURIComponent(topic.tag)}`}>#{topic.tag}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </section>

        <section className="landing-purpose" aria-labelledby="purpose-title">
          <div className="landing-section-intro">
            <p className="home-eyebrow">lebih dari etalase project</p>
            <h2 id="purpose-title">Satu tempat, tiga cara untuk bertumbuh.</h2>
            <p>
              Project, orang, dan perjalanan kerjanya saling terhubung. Jadi yang terlihat bukan
              cuma hasil akhir, tetapi siapa mengerjakan apa dan bagaimana semuanya berkembang.
            </p>
          </div>

          <div className="purpose-grid">
            <article className="purpose-card purpose-project">
              <LandingIcon kind="project" />
              <p className="purpose-number">01 · UNTUK PROJECT</p>
              <h3>Project punya rumah, bukan cuma sekali lewat di linimasa.</h3>
              <p>
                Tulis masalahnya, kabarkan progresnya, dan buka peran ketika butuh bantuan.
                Orang lain bisa memahami project-mu sebelum memutuskan untuk ikut.
              </p>
              <Link href="/kolaborasi">Lihat ekosistem project <Arrow /></Link>
            </article>

            <article className="purpose-card purpose-portfolio">
              <LandingIcon kind="portfolio" />
              <p className="purpose-number">02 · UNTUK PORTFOLIO</p>
              <h3>Portfolio yang tumbuh sambil kamu bekerja.</h3>
              <p>
                Kontribusi, peran, dan progres tercatat ketika benar-benar terjadi. Bukan klaim yang
                ditulis belakangan, melainkan jejak kerja yang bisa dibuka kembali.
              </p>
              <Link href="/orang">Lihat profil karya <Arrow /></Link>
            </article>

            <article className="purpose-card purpose-talent">
              <LandingIcon kind="people" />
              <p className="purpose-number">03 · UNTUK TALENT POOL</p>
              <h3>Temukan orang dari karya, bukan sekadar kata kunci CV.</h3>
              <p>
                Kenali skill lewat project yang dibangun dan dibantu. Saat butuh teman satu tim,
                konteks kerjanya sudah ada di depan mata.
              </p>
              <Link href="/orang">Jelajahi orang <Arrow /></Link>
            </article>
          </div>
        </section>

        <section className="talent-story" aria-labelledby="talent-story-title">
          <div className="talent-story-copy">
            <p className="home-eyebrow">orang di balik setiap karya</p>
            <h2 id="talent-story-title">Talent pool yang punya konteks.</h2>
            <p>
              Profil di AhsanProject tidak berdiri sendiri. Ia terhubung dengan project yang digagas,
              peran yang diambil, dan pekerjaan yang sudah diselesaikan.
            </p>
            <ul>
              <li><span>✓</span> Skill terlihat bersama bukti penggunaannya</li>
              <li><span>✓</span> Kontribusi kecil tetap punya tempat untuk tercatat</li>
              <li><span>✓</span> Project owner lebih mudah menemukan orang yang relevan</li>
            </ul>
            <Link className="talent-story-link" href="/orang">
              Temukan orang untuk project-mu <Arrow />
            </Link>
          </div>

          <div className="talent-preview" aria-label="Beberapa orang di AhsanProject">
            <div className="talent-preview-head">
              <span>Orang di AhsanProject</span>
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
              <h2 id="how-title">Mulai kecil. Kerjakan terbuka. Biarkan jejaknya bicara.</h2>
            </div>
            <p>
              Tidak perlu menunggu project sempurna atau punya tim lengkap. Mulai dari konteks yang
              cukup agar orang lain tahu kenapa project ini penting dan bagaimana mereka bisa ikut.
            </p>
          </div>

          <ol className="how-steps">
            <li>
              <span>01</span>
              <div className="how-step-mark" aria-hidden="true">⌁</div>
              <h3>Tunjukkan</h3>
              <p>Tulis project-mu: masalah, solusi, siapa yang dibantu, dan posisinya sekarang.</p>
            </li>
            <li>
              <span>02</span>
              <div className="how-step-mark" aria-hidden="true">＋</div>
              <h3>Temukan</h3>
              <p>Buka peran yang dibutuhkan, atau cari project yang cocok dengan skill dan waktumu.</p>
            </li>
            <li>
              <span>03</span>
              <div className="how-step-mark" aria-hidden="true">↗</div>
              <h3>Kerjakan</h3>
              <p>Bangun bersama, selesaikan bagian kecil, dan bagikan kabar saat project bergerak.</p>
            </li>
            <li>
              <span>04</span>
              <div className="how-step-mark" aria-hidden="true">✦</div>
              <h3>Tumbuhkan jejak</h3>
              <p>Project mendapat cerita; kontribusimu menjadi bukti kerja dan portfolio yang hidup.</p>
            </li>
          </ol>
        </section>

        <section className="landing-final-cta" aria-labelledby="final-cta-title">
          <p className="home-eyebrow">mulai dari yang kamu punya hari ini</p>
          <h2 id="final-cta-title">Ada karya yang ingin ditumbuhkan?</h2>
          <p>Tunjukkan prosesnya. Mungkin orang yang tepat sedang mencari tempat untuk ikut membantu.</p>
          <div>
            <Link className="home-hero-primary" href="/new"><span aria-hidden="true">+</span> Tampilkan project</Link>
            <Link className="landing-final-secondary" href="/kolaborasi">Cari kolaborasi <Arrow /></Link>
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
