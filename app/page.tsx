import { Logo } from "./logo";

const projects = [
  {
    number: "01",
    name: "Tap Tap Dzikr",
    label: "Untuk ibadah",
    description:
      "Ganti kebiasaan tap tap medsos dengan tap tap dzikr. Buka, tap, lalu tutup lagi.",
    url: "https://dzikir-harian.netlify.app/",
    domain: "dzikir-harian.netlify.app",
    accent: "mint",
  },
  {
    number: "02",
    name: "Wecard",
    label: "Untuk obrolan",
    description:
      "Flip card berisi pertanyaan pemantik obrolan bersama teman, keluarga, atau pasangan.",
    url: "https://wecard-app.netlify.app/",
    domain: "wecard-app.netlify.app",
    accent: "yellow",
  },
  {
    number: "03",
    name: "CariKontak",
    label: "Untuk sekitar",
    description:
      "Kumpulan kontak penting di daerah sekitarmu. Cari saat butuh, tanpa harus tanya sana-sini.",
    url: "https://carikontak.com/",
    domain: "carikontak.com",
    accent: "blue",
  },
  {
    number: "04",
    name: "Invoice Cepat",
    label: "Untuk usaha",
    description:
      "Buat invoice sederhana untuk jasa atau produkmu, tanpa proses yang panjang.",
    url: "https://umkmproject-invoice.netlify.app/",
    domain: "umkmproject-invoice.netlify.app",
    accent: "coral",
  },
  {
    number: "05",
    name: "Main Aman",
    label: "Untuk anak",
    description:
      "Bahan belajar untuk anak supaya lebih siap menjaga diri di lingkungan sekitarnya.",
    url: "https://mainaman.netlify.app/",
    domain: "mainaman.netlify.app",
    accent: "purple",
  },
  {
    number: "06",
    name: "Swegrowth",
    label: "Untuk komunitas",
    description:
      "Portal komunitas software engineer Indonesia untuk belajar dan berbagi bareng.",
    url: "https://swegrowth.id/",
    domain: "swegrowth.id",
    accent: "green",
  },
] as const;

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <span className={`arrow ${diagonal ? "arrow-diagonal" : ""}`} aria-hidden="true">
      →
    </span>
  );
}

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Ahsan Project, kembali ke atas">
          <Logo className="brand-mark" />
          <span>Ahsan Project</span>
        </a>
        <nav aria-label="Navigasi utama">
          <a href="#projects">Semua proyek</a>
          <a className="nav-cta" href="#about">
            Tentang <Arrow />
          </a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Semua proyek di satu tempat</p>
          <h1>
            Ide kecil.
            <br />
            <em>Dampak baik.</em>
          </h1>
          <p className="hero-description">
            Ahsan Project adalah kumpulan proyek digital buatan <strong>Zikrul Ihsan</strong>.
            Kebanyakan berawal dari masalah kecil yang saya alami sendiri, lalu ternyata
            berguna juga untuk orang lain.
          </p>
          <a className="primary-button" href="#projects">
            Lihat proyek <Arrow />
          </a>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="sun">☀</div>
          <div className="hero-note">
            <span>do</span>
            <strong>ahsan</strong>
            <small>/aḥ·san/ — lakukan yang terbaik</small>
          </div>
          <div className="spark spark-one">✦</div>
          <div className="spark spark-two">✦</div>
        </div>
      </section>

      <section className="projects-section" id="projects">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span /> Yang sedang saya bangun</p>
            <h2>Dibuat untuk<br />dipakai.</h2>
          </div>
          <p>
            Semuanya sudah online dan bisa langsung dicoba.
            Klik salah satu untuk membukanya di tab baru.
          </p>
        </div>

        <div className="project-grid">
          {projects.map((project) => (
            <a
              className={`project-card ${project.accent}`}
              href={project.url}
              key={project.name}
              target="_blank"
              rel="noreferrer"
              aria-label={`Buka ${project.name} di tab baru`}
            >
              <div className="card-topline">
                <span className="project-number">{project.number}</span>
                <span className="project-label">{project.label}</span>
              </div>
              <div className="project-glyph" aria-hidden="true">
                {project.number === "01" && "○○○"}
                {project.number === "02" && "▱"}
                {project.number === "03" && "⌖"}
                {project.number === "04" && "≡"}
                {project.number === "05" && "✦"}
                {project.number === "06" && "↗"}
              </div>
              <div className="card-content">
                <h3>{project.name}</h3>
                <p>{project.description}</p>
              </div>
              <div className="card-footer">
                <span>{project.domain}</span>
                <span className="round-arrow"><Arrow diagonal /></span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="about-section" id="about">
        <p className="eyebrow light"><span /> Tentang nama ini</p>
        <div className="about-grid">
          <h2>
            Nama saya Ihsan.
            <br />
            Niatnya juga <em>ihsan.</em>
          </h2>
          <div className="about-copy">
            <p>
              <strong>Ahsan</strong> berarti melakukan sesuatu dengan sebaik-baiknya.
              Itu standar yang saya pakai untuk setiap proyek di sini, sekecil apa pun
              proyeknya.
            </p>
            <p>
              Saya kerjakan satu per satu di waktu luang. Kalau ada satu yang kepakai
              sama kamu, itu sudah lebih dari cukup.
            </p>
          </div>
        </div>
        <div className="marquee" aria-label="Mulai kecil, rawat terus, do ahsan">
          <span>mulai kecil</span><i>✦</i><span>rawat terus</span><i>✦</i><span>do ahsan</span>
        </div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top">
          <Logo className="brand-mark" />
          <span>Ahsan Project</span>
        </a>
        <p>Dibuat oleh Zikrul Ihsan.</p>
        <a href="https://github.com/zikrulihsan/ahsanproject" target="_blank" rel="noreferrer">
          GitHub <Arrow diagonal />
        </a>
      </footer>
    </main>
  );
}
