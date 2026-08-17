const projects = [
  {
    number: "01",
    name: "Tap Tap Dzikr",
    label: "Untuk hati",
    description:
      "Ganti kebiasaan tap tap medsos dengan tap tap dzikr—jeda kecil untuk hati yang lebih tenang.",
    url: "https://dzikir-harian.netlify.app/",
    domain: "dzikir-harian.netlify.app",
    accent: "mint",
  },
  {
    number: "02",
    name: "Wecard",
    label: "Untuk kedekatan",
    description:
      "Flip card berisi pertanyaan untuk membuka obrolan yang lebih dekat bersama teman, keluarga, dan pasangan.",
    url: "https://wecard-app.netlify.app/",
    domain: "wecard-app.netlify.app",
    accent: "yellow",
  },
  {
    number: "03",
    name: "CariKontak",
    label: "Untuk sekitar",
    description:
      "Simpan dan cari kontak penting di daerah sekitarmu—lebih mudah ditemukan saat benar-benar dibutuhkan.",
    url: "https://carikontak.com/",
    domain: "carikontak.com",
    accent: "blue",
  },
  {
    number: "04",
    name: "Invoice Cepat",
    label: "Untuk usaha",
    description:
      "Buat invoice sederhana untuk jasa atau produkmu, tanpa proses panjang dan tanpa bikin pusing.",
    url: "https://umkmproject-invoice.netlify.app/",
    domain: "umkmproject-invoice.netlify.app",
    accent: "coral",
  },
  {
    number: "05",
    name: "Main Aman",
    label: "Untuk anak",
    description:
      "Tempat belajar agar anak lebih siap menghadapi berbagai lingkungan dan keadaan dengan aman.",
    url: "https://mainaman.netlify.app/",
    domain: "mainaman.netlify.app",
    accent: "purple",
  },
  {
    number: "06",
    name: "Swegrowth",
    label: "Untuk bertumbuh",
    description:
      "Portal komunitas software engineer Indonesia untuk belajar, berbagi, dan tumbuh bersama.",
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
          <span className="brand-mark">a.</span>
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
          <p className="eyebrow"><span /> Satu rumah untuk hal-hal baik</p>
          <h1>
            Ide kecil.
            <br />
            <em>Dampak baik.</em>
          </h1>
          <p className="hero-description">
            Ahsan Project adalah kumpulan proyek digital buatan <strong>Zikrul Ihsan</strong>—
            lahir dari satu niat sederhana: membuat sesuatu yang berguna bagi sesama.
          </p>
          <a className="primary-button" href="#projects">
            Jelajahi proyek <Arrow />
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
            <p className="eyebrow"><span /> Yang sedang kami bangun</p>
            <h2>Proyek untuk<br />hal-hal baik.</h2>
          </div>
          <p>
            Dari membangun kebiasaan baik sampai bertumbuh bersama komunitas.
            Pilih yang paling kamu butuhkan hari ini.
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
            Misinya pun <em>ihsan.</em>
          </h2>
          <div className="about-copy">
            <p>
              <strong>Ahsan</strong> berarti melakukan dengan sebaik-baiknya. Bagi saya,
              teknologi bukan cuma tentang apa yang bisa dibuat, tapi tentang siapa yang
              bisa terbantu olehnya.
            </p>
            <p>
              Ini adalah ruang untuk eksperimen, karya, dan niat baik yang terus bertumbuh—
              satu proyek kecil dalam satu waktu.
            </p>
          </div>
        </div>
        <div className="marquee" aria-label="Build small, care deeply, do ahsan">
          <span>build small</span><i>✦</i><span>care deeply</span><i>✦</i><span>do ahsan</span>
        </div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark">a.</span>
          <span>Ahsan Project</span>
        </a>
        <p>Made with niat baik by Zikrul Ihsan.</p>
        <a href="https://github.com/zikrulihsan/ahsanproject" target="_blank" rel="noreferrer">
          GitHub <Arrow diagonal />
        </a>
      </footer>
    </main>
  );
}
