import { Logo } from "./logo";
import { copy, paths, projects, type Lang } from "./content";

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <span className={`arrow ${diagonal ? "arrow-diagonal" : ""}`} aria-hidden="true">
      →
    </span>
  );
}

function Brand({ label, footer = false }: { label: string; footer?: boolean }) {
  return (
    <a className={`brand ${footer ? "footer-brand" : ""}`} href="#top" aria-label={label}>
      <Logo className="brand-mark" />
      <span>
        Ahsan <span className="brand-alt">Project</span>
      </span>
    </a>
  );
}

export function Site({ lang }: { lang: Lang }) {
  const t = copy[lang];
  const other: Lang = lang === "id" ? "en" : "id";

  return (
    <main lang={lang}>
      <header className="site-header">
        <Brand label={t.brandLabel} />
        <nav aria-label={lang === "id" ? "Navigasi utama" : "Main navigation"}>
          <a href="#projects">{t.nav.projects}</a>
          <a className="lang-switch" href={paths[other]} hrefLang={other} title={t.langSwitch.title}>
            {t.langSwitch.label}
          </a>
          <a className="nav-cta" href="#about">
            {t.nav.about} <Arrow />
          </a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> {t.hero.eyebrow}
          </p>
          <h1>
            {t.hero.titleTop}
            <br />
            <em>{t.hero.titleEm}</em>
          </h1>
          <p className="hero-description">
            {t.hero.lead[0]}
            <strong>{t.hero.lead[1]}</strong>
            {t.hero.lead[2]}
          </p>
          <a className="primary-button" href="#projects">
            {t.hero.cta} <Arrow />
          </a>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="sun">☀</div>
          <div className="hero-note">
            <span>do</span>
            <strong>ahsan</strong>
            <small>{t.hero.definition}</small>
          </div>
          <div className="spark spark-one">✦</div>
          <div className="spark spark-two">✦</div>
        </div>
      </section>

      <section className="projects-section" id="projects">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <span /> {t.work.eyebrow}
            </p>
            <h2>
              {t.work.titleTop}
              <br />
              {t.work.titleBottom}
            </h2>
          </div>
          <p>{t.work.intro}</p>
        </div>

        <div className="project-grid">
          {projects.map((project) => (
            <a
              className={`project-card ${project.accent}`}
              href={project.url}
              key={project.name}
              target="_blank"
              rel="noreferrer"
              aria-label={t.work.cardHint.replace("{name}", project.name)}
            >
              <div className="card-topline">
                <span className="project-number">{project.number}</span>
                <span className="project-label">{project.label[lang]}</span>
              </div>
              <div className="project-glyph" aria-hidden="true">
                {project.glyph}
              </div>
              <div className="card-content">
                <h3>{project.name}</h3>
                <p>{project.description[lang]}</p>
              </div>
              <div className="card-footer">
                <span>{project.domain}</span>
                <span className="round-arrow">
                  <Arrow diagonal />
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="about-section" id="about">
        <p className="eyebrow light">
          <span /> {t.about.eyebrow}
        </p>
        <div className="about-grid">
          <h2>
            {t.about.titleTop}
            <br />
            {t.about.titleBefore}
            <em>{t.about.titleEm}</em>
          </h2>
          <div className="about-copy">
            <p>
              <strong>{t.about.bodyLead[0]}</strong>
              {t.about.bodyLead[1]}
            </p>
            <p>{t.about.body}</p>
          </div>
        </div>
        <div className="marquee" aria-label={t.about.marquee.join(", ")}>
          <span>{t.about.marquee[0]}</span>
          <i>✦</i>
          <span>{t.about.marquee[1]}</span>
          <i>✦</i>
          <span>{t.about.marquee[2]}</span>
        </div>
      </section>

      <footer>
        <Brand label={t.brandLabel} footer />
        <p>{t.footer.credit}</p>
        <a href="https://github.com/zikrulihsan/ahsanproject" target="_blank" rel="noreferrer">
          GitHub <Arrow diagonal />
        </a>
      </footer>
    </main>
  );
}
