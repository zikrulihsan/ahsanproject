import Link from "next/link";
import { about, aboutPaths, type Lang } from "../content";
import { SiteFooter, SiteHeader, Arrow } from "./shell";

export function AboutPage({ lang }: { lang: Lang }) {
  const t = about[lang];
  const other: Lang = lang === "id" ? "en" : "id";

  return (
    <>
      <SiteHeader returnTo={aboutPaths[lang]} />

      <main className="about-page" lang={lang}>
        <section className="about-section">
          <div className="about-top">
            <p className="eyebrow light">
              <span /> {t.eyebrow}
            </p>
            <Link
              className="lang-switch"
              href={aboutPaths[other]}
              hrefLang={other}
              title={t.switchTitle}
            >
              {t.switchLabel}
            </Link>
          </div>

          <div className="about-grid">
            <h1>
              {t.headingTop}
              <br />
              {t.headingBefore}
              <em>{t.headingEm}</em>
            </h1>
            <div className="about-copy">
              <p>
                <strong>{t.lead[0]}</strong>
                {t.lead[1]}
              </p>
              {t.body.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="marquee" aria-label={t.marquee.join(", ")}>
            <span>{t.marquee[0]}</span>
            <i>✦</i>
            <span>{t.marquee[1]}</span>
            <i>✦</i>
            <span>{t.marquee[2]}</span>
          </div>
        </section>

        <section className="how-section">
          <h2>{t.howHeading}</h2>
          <ol className="how-list">
            {t.how.map((step) => (
              <li key={step.step}>
                <span>{step.step}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link className="primary-button" href="/new">
            {lang === "id" ? "Taruh ide" : "Post an idea"} <Arrow />
          </Link>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
